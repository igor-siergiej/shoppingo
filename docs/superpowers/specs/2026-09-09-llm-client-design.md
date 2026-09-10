# Shared LLM Client for Recipe Import

**Date:** 2026-09-09
**Status:** Approved, pending implementation

## Problem

Two infrastructure classes call fal.ai's `any-llm` endpoint to turn recipe text into
structured JSON: `FalRecipeExtractor` (Tier 3 fallback, tolerant) and `FalRecipeParser`
(LLM-first parsing, strict). A third, `FalIngredientStructurer`, is designed and approved
but not yet built.

Each class hand-rolls the same transport and defensive parsing:

- `fetch` to `https://fal.run/fal-ai/any-llm` with a `Key` authorization header
- an `AbortController` and a 15s timeout, cleared in a `finally`
- `response.ok` and `data.error` handling, both throwing with `status: 502`
- pulling the first `{ ... }` out of the model output with `indexOf` / `lastIndexOf`
  because the model may wrap JSON in prose or code fences
- ad-hoc field coercion (`typeof x === 'string' ? x.trim() : ''`, array filters)

The transport block is copy-pasted between the two existing classes and would be copied a
third time. The field coercion is bespoke per class and easy to get subtly wrong. Neither
class retries when the model returns malformed or schema-invalid output — a single bad
generation fails the whole import.

Prior LLM specs in this repo deliberately deferred any shared abstraction and any metrics,
keeping each integration minimal while the LLM path was still being evaluated. There are now
three operations that need the same plumbing, so consolidating it is worth the surface area.

## Goals

1. One place owns the fal `any-llm` transport: request, auth, timeout, error handling,
   JSON-object extraction.
2. Structured output is validated against a declared schema. Invalid output is retried with
   the validation error fed back to the model, up to a configurable attempt count.
3. Each existing operation class keeps its domain interface, its directory, its own tests,
   and its own prompt. Only transport and parsing move out.
4. One structured log line per call: operation, model, attempts, latency, outcome.
5. No behaviour change visible to `RecipeImportService` or the web app.

## Non-goals

- **Model routing.** No cheap-model-then-escalate logic. The client takes a fixed model per
  call. A `model?: string` option is the seam for adding routing later.
- **Cost or token metrics.** fal `any-llm` does not return token usage. Logging stays
  structured-log-only, consistent with prior specs. Cost estimation from character counts is
  a follow-up, alongside routing.
- **Eval harness.** The golden dataset, scorers, and CI regression gate are a separate spec.
  This spec only ensures the `meta` object that harness will consume exists.
- **A shared package.** The client lives in `packages/api/src/infrastructure/`. Promotion to
  an `@imapps/llm` package is deferred until a second app needs it.
- **Changing the three-tier extraction flow, the image-generation path, or any UI.**
- **Provider abstraction.** fal-only. No `LlmClient` interface with multiple implementations.

## Design

### FalLlmClient (infrastructure)

`packages/api/src/infrastructure/FalLlmClient/index.ts`

```ts
import type { Logger } from '@imapps/api-utils';
import type { ZodType } from 'zod';

export interface CompleteStructuredOptions<T> {
    /** Identifies the call in logs, e.g. 'recipe.parse'. */
    operation: string;
    /** Output is parsed against this. `.transform()` is honoured. */
    schema: ZodType<T>;
    system: string;
    prompt: string;
    /** Defaults to the client's configured model, else 'google/gemini-2.5-flash-lite'. */
    model?: string;
    /** Defaults to 0. */
    temperature?: number;
    /** Defaults to 15000. */
    timeoutMs?: number;
    /** Total attempts including the first. Defaults to 2. */
    maxAttempts?: number;
}

export interface LlmResult<T> {
    value: T;
    meta: {
        operation: string;
        model: string;
        attempts: number;
        latencyMs: number;
    };
}

export class FalLlmClient {
    constructor(
        apiKey: string,
        logger?: Logger,
        defaults?: { model?: string }
    );

    completeStructured<T>(opts: CompleteStructuredOptions<T>): Promise<LlmResult<T>>;
}
```

`completeStructured` owns, once:

1. **Request.** `POST https://fal.run/fal-ai/any-llm`, `Authorization: Key <apiKey>`, body
   `{ model, system_prompt, prompt, temperature }`. `AbortController` aborted after
   `timeoutMs`, timer cleared in `finally`.
2. **Transport errors.** A thrown fetch (network, abort/timeout), `!response.ok`, or a
   `data.error` field each throw `Error` with `status: 502` and a message beginning
   `fal.ai any-llm error:`. These are **not** retried.
3. **JSON extraction.** From `data.output ?? ''`, take `slice(indexOf('{'), lastIndexOf('}') + 1)`
   and `JSON.parse`. A missing object or a parse failure counts as an invalid attempt.
4. **Validation.** `schema.safeParse(parsed)`. Success returns `LlmResult`. Failure counts as
   an invalid attempt.
5. **Retry.** While attempts remain, re-request with the user prompt suffixed:

   ```
   \n\nYour previous reply failed validation: <issues>. Return only corrected JSON, no prose.
   ```

   `<issues>` is the flattened Zod message on a schema failure, or
   `"no JSON object found"` / `"malformed JSON"` on an extraction failure.
6. **Exhaustion.** After `maxAttempts` invalid attempts, throw `Error` with `status: 502` and
   message `LLM output failed validation after <n> attempts`.
7. **Log.** Exactly one line via `logger?.info`, whatever the outcome:

   ```ts
   {
       operation, model, attempts, latencyMs,
       outcome: 'ok' | 'invalid' | 'error',
       promptChars: prompt.length,
       outputChars: lastOutput.length,
   }
   ```

`latencyMs` covers all attempts. `attempts` is the count actually made.

### Retrofit: FalRecipeParser

Keeps `RecipeParser` interface, `FalRecipeParser` class, directory, and test file.

- Constructor: `(client: FalLlmClient, options?: FalRecipeParserOptions)`. `apiKey` is gone.
  `options.model` / `options.timeoutMs` pass through to `completeStructured`.
- `SYSTEM_PROMPT` is unchanged.
- New module-const schema replaces `parseOutput` and `toParsedIngredient`:

  ```ts
  const ingredientSchema = z.object({
      name: z.string().trim().min(1),
      quantity: z.number().finite().optional(),
      unit: z.string().trim().optional(),
  }).transform((i) => (
      i.quantity === undefined
          ? { name: i.name }
          : { name: i.name, quantity: i.quantity, unit: i.unit?.trim() || 'pcs' }
  ));

  const parsedRecipeSchema = z.object({
      title: z.string().trim().catch(''),
      ingredients: z.array(ingredientSchema).min(1),
      instructions: z.array(z.string()).catch([]),
  });
  ```

  This preserves today's behaviour: `pcs` default unit, dropped `unit`/`quantity` when
  absent, `min(1)` ingredients (was `LLM returned no ingredients`), tolerant title and
  instructions.
- `parse(source)` becomes:

  ```ts
  const { value } = await this.client.completeStructured({
      operation: 'recipe.parse',
      schema: parsedRecipeSchema,
      system: SYSTEM_PROMPT,
      prompt: `Extract the recipe from this source:\n\n${source}`,
      model: this.model,
      timeoutMs: this.timeoutMs,
  });
  return value;
  ```

  The empty-source guard stays.

### Retrofit: FalRecipeExtractor

Same shape. `operation: 'recipe.extract'`. Schema is the tolerant one:

```ts
const extractedRecipeSchema = z.object({
    title: z.string().catch(''),
    ingredients: z.array(z.string()).catch([]),
    instructions: z.array(z.string()).catch([]),
});
```

`.catch` on every field means a structurally-present-but-messy response still yields a
usable draft, matching the current `toStrings` tolerance. The object itself must still parse.

### FalIngredientStructurer

Not built here. When implemented against its approved spec, it uses `completeStructured` with
`operation: 'recipe.structure-ingredients'` and a schema enforcing one entry per input line
(`z.array(...).length(lines.length)` built per call). This spec does not create the file.

### Config

No new keys. The client is constructed from existing config:

- API key: `recipeImportLlmApiKey || falKey`
- model: `recipeImportLlmModel` (undefined falls to the client default)

### Dependency wiring

`packages/api/src/dependencies/types.ts` — one new token, `FalLlmClient`, plus its entry in
the `Dependencies` type map.

`packages/api/src/dependencies/index.ts`, following the existing
`registerSingleton(token, class { constructor() { return <instance>; } })` pattern:

```ts
dependencyContainer.registerSingleton(
    DependencyToken.FalLlmClient,
    // @ts-expect-error - Dependency injection requires constructor return override
    class {
        constructor() {
            return new FalLlmClient(
                config.get('recipeImportLlmApiKey') || config.get('falKey') || '',
                dependencyContainer.resolve(DependencyToken.Logger),
                { model: config.get('recipeImportLlmModel') },
            );
        }
    }
);
```

The `RecipeTextExtractor` and `RecipeParser` singletons resolve `DependencyToken.FalLlmClient`
and pass it to the constructor instead of the api key string.

### Error handling

Unchanged from the caller's view: every failure path throws `Error` with `status: 502`, so
`RecipeImportService`'s existing propagation and the handler's status mapping are untouched.
Messages are more specific:

| Cause | Message prefix |
|---|---|
| network / timeout / non-OK / `data.error` | `fal.ai any-llm error:` |
| no `{...}` in output, or `JSON.parse` throws, after retries | `LLM output failed validation after N attempts` |
| schema mismatch after retries | `LLM output failed validation after N attempts` |

## Testing

Bun native test runner (`bun:test`), stubbed `fetch`, per project convention.

### FalLlmClient — new `index.test.ts`

- happy path: one fetch, valid JSON, `meta.attempts === 1`, `outcome: 'ok'` logged
- model wraps JSON in prose / code fences: extracted and parsed
- malformed JSON on attempt 1, valid on attempt 2: resolves, `meta.attempts === 2`, second
  request body's prompt contains `failed validation`
- schema-invalid every attempt: throws after `maxAttempts`, message
  `failed validation after 2 attempts`, `outcome: 'invalid'` logged
- `!response.ok`: throws `status: 502`, message starts `fal.ai any-llm error:`, exactly one
  fetch (no retry)
- `data.error` present: same
- fetch rejects (network): throws `status: 502`, one fetch
- abort fires at `timeoutMs`: throws `status: 502`
- `.transform` in the schema is reflected in `value`

### FalRecipeParser / FalRecipeExtractor — modified test files

- construct with a fake `FalLlmClient` whose `completeStructured` returns a fixed
  `LlmResult` or throws
- keep every existing output-shape assertion (carbonara names, `pcs` default, tolerant
  fields, empty-source guard, 502 propagation)
- drop the stubbed-`fetch` and JSON-fixture assertions — those now belong to the client
- assert the `operation` and `schema` passed to `completeStructured`

### RecipeImportService

Unchanged. Existing tests with a fake structurer / parser still pass.

## Files

**New**

- `packages/api/src/infrastructure/FalLlmClient/index.ts`
- `packages/api/src/infrastructure/FalLlmClient/index.test.ts`

**Modified**

- `packages/api/src/infrastructure/FalRecipeParser/index.ts` — constructor, schema, delegate
- `packages/api/src/infrastructure/FalRecipeParser/index.test.ts` — fake client
- `packages/api/src/infrastructure/FalRecipeExtractor/index.ts` — constructor, schema, delegate
- `packages/api/src/infrastructure/FalRecipeExtractor/index.test.ts` — fake client
- `packages/api/src/dependencies/types.ts` — `LlmClient` token
- `packages/api/src/dependencies/index.ts` — register client, inject into two factories
- `packages/api/package.json` — add `zod`

**Unchanged**

- domain interfaces (`RecipeParser`, `RecipeTextExtractor`, `IngredientStructurer`)
- `RecipeImportService` and its tests
- `config/index.ts`, `.env`

## Follow-ups

- **Model routing.** Replace `model?: string` with a policy that escalates to a stronger
  model on repeated validation failure or a confidence signal.
- **Cost estimation.** Estimate tokens from `promptChars` / `outputChars` and a per-model
  rate; add `estimatedCostUsd` to the log line.
- **Eval harness.** Separate spec: golden dataset of recipe URLs, per-field scorers, a CI
  job that fails on regression, consuming `LlmResult.meta`.
- **`@imapps/llm` package.** If jewellery-catalogue grows a text-AI feature, promote
  `FalLlmClient` and this validation/retry logic out of the app.
