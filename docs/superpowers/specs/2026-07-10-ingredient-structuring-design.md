# Ingredient Structuring on Recipe Import

**Date:** 2026-07-10
**Status:** Approved, pending implementation

## Problem

Recipe import produces ingredient names polluted with measurements and qualifiers. Importing
<https://www.recipesfromitaly.com/spaghetti-carbonara-original-recipe/> yields names like
`spaghetti (- 12 oz)` and `freshly ground black pepper (- to taste)`.

This is not a parsing bug. The site's JSON-LD publishes the noise inside the ingredient strings:

```json
[
  "350 g spaghetti (- 12 oz)",
  "200 g guanciale (Italian cured pork cheek) (- 7 oz)",
  "4  whole eggs",
  "100 g finely grated Pecorino Romano DOP (- about 1 cup)",
  "freshly ground black pepper (- to taste)"
]
```

`parse-ingredient` correctly extracts the leading `350 g` into quantity/unit. Everything remaining
becomes `description`, verbatim. It has no concept of "this trailing parenthetical is a unit
conversion; discard it."

Ingredient names feed the AI image-generation prompt. Measurements and qualifiers in the name
degrade the generated image.

## Goals

1. Ingredient names contain the ingredient and nothing else — no measurements, no parentheticals,
   no qualifiers.
2. Quantity/unit pills keep working exactly as they do today.
3. A flag switches ingredient structuring between rule-based and LLM-based, so the LLM approach can
   be evaluated against real imports before committing to per-import API costs.

## Non-goals

- Changing the Tier 1/2/3 extraction tiers in `RecipeImportService.importFromUrl`.
- Changing the image-generation prompt.
- Any UI change. The pills are already correct.

## Design

### The seam

A new domain interface isolates "raw ingredient lines in, structured ingredients out" from the
import pipeline:

```ts
export interface ParsedIngredient {
    name: string;
    quantity?: number;
    unit?: string;
}

export interface IngredientStructurer {
    /** Turn raw ingredient lines into names plus optional quantity/unit. Names carry no measurements. */
    structure(lines: string[]): Promise<ParsedIngredient[]>;
}
```

**Contract:** exactly one output per input line, in input order. Implementations that cannot honour
this must throw.

`RecipeImportService.toIngredient()` is removed. `importFromUrl` calls `structure()` once on
`draft.ingredients` and assigns ids to the results. The service no longer imports
`parse-ingredient`.

### RuleIngredientStructurer (domain)

Default. Wraps today's behaviour, then cleans the name:

1. `parseIngredient(line)` — extract quantity and unit as today.
2. On the resulting `description`, in order:
   - remove every `(...)` group,
   - remove a trailing `to taste | as needed | optional | divided | plus more ...`,
   - collapse whitespace, trim stray leading/trailing punctuation.
3. Fall back to the raw line if the cleaned name is empty.

**Parse first, strip second.** `1 (14 oz) can diced tomatoes` must keep its quantity of `1` before
the parenthetical is discarded. Stripping first would destroy that.

Per the design discussion, *all* parentheticals are stripped, including genuine clarifiers such as
`(Italian cured pork cheek)`. The image-generation model is expected to know what guanciale is.

### FalIngredientStructurer (infrastructure)

One `fal.run/fal-ai/any-llm` call per import, all lines batched into a single request. Mirrors
`FalRecipeExtractor`: `gemini-2.5-flash-lite` default, `temperature: 0`, 15s timeout, defensive
JSON extraction from the response.

Credentials and model reuse existing config: `recipeImportLlmApiKey || falKey`, and
`recipeImportLlmModel`.

The prompt instructs: return a JSON array with one object per input line, in order; `name` is the
bare ingredient with no measurements, no parentheticals, no qualifiers; omit `quantity`/`unit` when
the line has none.

### Error handling

`FalIngredientStructurer` **throws** on network error, non-OK response, malformed JSON, or an array
whose length does not match the input. The error carries `status: 502` and propagates — the import
fails.

This is deliberate and differs from the Tier 3 extractor, which swallows errors. Tier 3 is a
best-effort upgrade over a draft that already exists. Ingredient structuring has no such draft to
fall back on, and silently substituting rule-based output would mask how often the LLM path fails —
defeating the purpose of the evaluation.

**Consequence:** with the flag enabled, a transient fal outage turns every import into a 502. The
flag defaults off. It is an evaluation tool, not a production default, until the data says
otherwise.

### Flag and wiring

New config key, orthogonal to the existing `RECIPE_IMPORT_LLM_ENABLED` (which gates Tier 3
extraction):

```ts
recipeImportLlmIngredients: { parser: parsers.boolean, from: 'RECIPE_IMPORT_LLM_INGREDIENTS', optional: true },
```

Two new dependency tokens, `RuleIngredientStructurer` and `LlmIngredientStructurer`. The
`RecipeImportService` registration resolves one based on the flag and injects it as a required
constructor argument.

The two flags compose freely: LLM extraction with rule structuring, rule extraction with LLM
structuring, both, or neither.

### Observability

The point of the flag is to produce data. Each import logs one line after structuring:

- `strategy`: `rule` | `llm`
- `lineCount`
- `durationMs`

Enough to answer "is this worth paying for" from logs alone. No metrics infrastructure.

## Testing

Bun native test runner (`bun:test`), per project convention.

**RuleIngredientStructurer** — the five carbonara lines as a fixture, asserting exact names and
pills. Plus: `1 (14 oz) can diced tomatoes` keeps quantity `1`; a line that is nothing but a
parenthetical falls back to the raw line; trailing `to taste` without parentheses is stripped.

**FalIngredientStructurer** — stubbed `fetch`. Happy path; malformed JSON; array length mismatch;
non-OK response; network error. Each failure asserts a throw with `status: 502`.

**RecipeImportService** — inject a fake `IngredientStructurer`. Import logic stays decoupled from
either implementation. Existing tier tests are unaffected. One new test asserts a structurer throw
propagates rather than being swallowed.

Both structurers live in their own directories with their own test files, matching the existing
`domain/` and `infrastructure/` split.

## Files

**New**

- `packages/api/src/domain/IngredientStructurer/types.ts` — interface, `ParsedIngredient`
- `packages/api/src/domain/RuleIngredientStructurer/index.ts` + `index.test.ts`
- `packages/api/src/infrastructure/FalIngredientStructurer/index.ts` + `index.test.ts`

**Modified**

- `packages/api/src/domain/RecipeImportService/index.ts` — drop `toIngredient`, inject structurer
- `packages/api/src/domain/RecipeImportService/index.test.ts` — fake structurer, propagation test
- `packages/api/src/config/index.ts` — `recipeImportLlmIngredients`
- `packages/api/src/dependencies/types.ts` — two tokens
- `packages/api/src/dependencies/index.ts` — register both, select on flag
- `.env` — document `RECIPE_IMPORT_LLM_INGREDIENTS`
