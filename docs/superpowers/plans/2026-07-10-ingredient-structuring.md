# Ingredient Structuring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingredient names imported from recipes carry no measurements, parentheticals, or qualifiers, and a flag switches structuring between a rule-based and an LLM-based implementation.

**Architecture:** Introduce an `IngredientStructurer` interface in the domain layer. `RecipeImportService` stops calling `parse-ingredient` directly and delegates to an injected structurer. Two implementations: `RuleIngredientStructurer` (default, `parse-ingredient` + name cleanup) and `FalIngredientStructurer` (one batched LLM call, throws 502 on any failure). The DI container picks one based on `RECIPE_IMPORT_LLM_INGREDIENTS`.

**Tech Stack:** TypeScript, Bun native test runner (`bun:test`), Koa, `parse-ingredient`, fal.ai `any-llm` endpoint, custom DI container from `@imapps/api-utils`.

**Spec:** `docs/superpowers/specs/2026-07-10-ingredient-structuring-design.md`

## Global Constraints

- Package manager is **Bun**. Never `npm` or `yarn`.
- Tests import from `bun:test` only. No Vitest, no Jest.
- API test coverage threshold is 90%.
- Run `bun run lint:fix` before every commit (Biome, not ESLint).
- Commits follow Conventional Commits (enforced by commitlint + Husky).
- `parse-ingredient` returns `quantity: null` (not `undefined`) when no quantity is present. Guard with `typeof x === 'number'`, never with `x !== undefined`.
- The `IngredientStructurer.structure()` contract: exactly one output per input line, in input order. Implementations that cannot honour this must throw.
- All parentheticals are stripped from ingredient names, including genuine clarifiers like `(Italian cured pork cheek)`. This is intentional.

## Ground Truth: parse-ingredient behaviour

Verified against the installed version. Later tasks depend on these exact values.

| Input line | quantity | unitOfMeasure | description |
|---|---|---|---|
| `350 g spaghetti (- 12 oz)` | `350` | `"g"` | `"spaghetti (- 12 oz)"` |
| `200 g guanciale (Italian cured pork cheek) (- 7 oz)` | `200` | `"g"` | `"guanciale (Italian cured pork cheek) (- 7 oz)"` |
| `4  whole eggs` | `4` | `null` | `"whole eggs"` |
| `100 g finely grated Pecorino Romano DOP (- about 1 cup)` | `100` | `"g"` | `"finely grated Pecorino Romano DOP (- about 1 cup)"` |
| `freshly ground black pepper (- to taste)` | `null` | `null` | `"freshly ground black pepper (- to taste)"` |
| `1 (14 oz) can diced tomatoes` | `1` | `null` | `"(14 oz) can diced tomatoes"` |
| `salt to taste` | `null` | `null` | `"salt to taste"` |
| `1/2 cup salt` | `0.5` | `"cup"` | `"salt"` |
| `2 cloves garlic` | `2` | `"cloves"` | `"garlic"` |

Note `1 (14 oz) can diced tomatoes` keeps `quantity: 1` **only because parse runs before stripping**. Never reverse that order.

## File Structure

**Create**

- `packages/api/src/domain/IngredientStructurer/types.ts` — the `IngredientStructurer` interface and `ParsedIngredient` type. Interface only; no implementation.
- `packages/api/src/domain/RuleIngredientStructurer/index.ts` — default implementation.
- `packages/api/src/domain/RuleIngredientStructurer/index.test.ts`
- `packages/api/src/infrastructure/FalIngredientStructurer/index.ts` — LLM implementation.
- `packages/api/src/infrastructure/FalIngredientStructurer/index.test.ts`

**Modify**

- `packages/api/src/domain/RecipeImportService/index.ts` — remove `toIngredient` (lines 92-103), inject structurer, log strategy.
- `packages/api/src/domain/RecipeImportService/index.test.ts` — 4 construction sites (lines 36, 280, 298, 315), updated ingredient assertions, new propagation test.
- `packages/api/src/config/index.ts` — add `recipeImportLlmIngredients`.
- `packages/api/src/dependencies/types.ts` — add two tokens + two map entries.
- `packages/api/src/dependencies/index.ts` — register both structurers, select on flag.
- `.env` — document the new flag.

---

### Task 1: IngredientStructurer interface and RuleIngredientStructurer

**Files:**
- Create: `packages/api/src/domain/IngredientStructurer/types.ts`
- Create: `packages/api/src/domain/RuleIngredientStructurer/index.ts`
- Test: `packages/api/src/domain/RuleIngredientStructurer/index.test.ts`

**Interfaces:**
- Consumes: `parseIngredient` from the `parse-ingredient` package (already a dependency).
- Produces: `IngredientStructurer` (with `strategy: 'rule' | 'llm'` and `structure(lines: string[]): Promise<ParsedIngredient[]>`), `ParsedIngredient` (`{ name: string; quantity?: number; unit?: string }`), and the class `RuleIngredientStructurer`. Tasks 2, 3 and 4 all depend on these exact names.

- [ ] **Step 1: Write the interface**

Create `packages/api/src/domain/IngredientStructurer/types.ts`:

```ts
/** An ingredient line broken into a clean name plus optional measurement. */
export interface ParsedIngredient {
    name: string;
    quantity?: number;
    unit?: string;
}

export interface IngredientStructurer {
    /** Identifies the implementation in import logs, so the LLM path can be evaluated against the rule path. */
    readonly strategy: 'rule' | 'llm';

    /**
     * Turn raw ingredient lines into names plus optional quantity/unit. Names carry no measurements.
     * Returns exactly one entry per input line, in input order. Throws if that cannot be honoured.
     */
    structure(lines: string[]): Promise<ParsedIngredient[]>;
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/api/src/domain/RuleIngredientStructurer/index.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';

import { RuleIngredientStructurer } from './index';

describe('RuleIngredientStructurer', () => {
    const structurer = new RuleIngredientStructurer();

    it('reports the rule strategy', () => {
        expect(structurer.strategy).toBe('rule');
    });

    it('strips unit conversions and clarifiers from real JSON-LD ingredient lines', async () => {
        const result = await structurer.structure([
            '350 g spaghetti (- 12 oz)',
            '200 g guanciale (Italian cured pork cheek) (- 7 oz)',
            '4  whole eggs',
            '100 g finely grated Pecorino Romano DOP (- about 1 cup)',
            'freshly ground black pepper (- to taste)',
        ]);

        expect(result).toEqual([
            { name: 'spaghetti', quantity: 350, unit: 'g' },
            { name: 'guanciale', quantity: 200, unit: 'g' },
            { name: 'whole eggs', quantity: 4, unit: 'pcs' },
            { name: 'finely grated Pecorino Romano DOP', quantity: 100, unit: 'g' },
            { name: 'freshly ground black pepper' },
        ]);
    });

    it('parses the quantity before stripping a leading parenthetical', async () => {
        const result = await structurer.structure(['1 (14 oz) can diced tomatoes']);

        expect(result).toEqual([{ name: 'can diced tomatoes', quantity: 1, unit: 'pcs' }]);
    });

    it('strips a trailing qualifier that has no parentheses', async () => {
        const result = await structurer.structure(['salt to taste', '2 onions, divided']);

        expect(result).toEqual([{ name: 'salt' }, { name: 'onions', quantity: 2, unit: 'pcs' }]);
    });

    it('falls back to the raw line when cleaning would leave an empty name', async () => {
        const result = await structurer.structure(['(optional)']);

        expect(result).toEqual([{ name: '(optional)' }]);
    });

    it('returns one entry per input line, in order', async () => {
        const result = await structurer.structure(['1/2 cup salt', '2 cloves garlic', '3 eggs']);

        expect(result).toEqual([
            { name: 'salt', quantity: 0.5, unit: 'cup' },
            { name: 'garlic', quantity: 2, unit: 'cloves' },
            { name: 'eggs', quantity: 3, unit: 'pcs' },
        ]);
    });

    it('returns an empty array for no lines', async () => {
        expect(await structurer.structure([])).toEqual([]);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test src/domain/RuleIngredientStructurer`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 4: Write the implementation**

Create `packages/api/src/domain/RuleIngredientStructurer/index.ts`:

```ts
import { parseIngredient } from 'parse-ingredient';

import type { IngredientStructurer, ParsedIngredient } from '../IngredientStructurer/types';

const PARENTHETICAL = /\([^)]*\)/g;
const TRAILING_QUALIFIER = /,?\s*\b(?:to taste|as needed|optional|divided|plus more.*)\s*$/i;
const EDGE_PUNCTUATION = /^[\s,;:.\-–—]+|[\s,;:.\-–—]+$/g;

/**
 * Sites publish unit conversions and qualifiers inside the ingredient string itself
 * ("350 g spaghetti (- 12 oz)"). Names feed the AI image prompt, so strip them.
 */
const cleanName = (description: string): string =>
    description
        .replace(PARENTHETICAL, ' ')
        .replace(TRAILING_QUALIFIER, '')
        .replace(/\s+/g, ' ')
        .replace(EDGE_PUNCTUATION, '')
        .trim();

export class RuleIngredientStructurer implements IngredientStructurer {
    readonly strategy = 'rule' as const;

    async structure(lines: string[]): Promise<ParsedIngredient[]> {
        return lines.map((line) => this.structureLine(line));
    }

    // Parse first, strip second: "1 (14 oz) can diced tomatoes" must keep its quantity of 1.
    private structureLine(line: string): ParsedIngredient {
        const [parsed] = parseIngredient(line);
        const name = cleanName(parsed?.description ?? '') || line;
        const hasQuantity = typeof parsed?.quantity === 'number';

        return {
            name,
            ...(hasQuantity && { quantity: parsed.quantity as number }),
            ...(hasQuantity && { unit: parsed?.unitOfMeasure || 'pcs' }),
        };
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test src/domain/RuleIngredientStructurer`
Expected: PASS, 7 tests

If `2 onions, divided` does not yield `{ name: 'onions', quantity: 2, unit: 'pcs' }`, print the raw `parseIngredient('2 onions, divided')` output and adjust the *test expectation* to match reality — do not weaken `TRAILING_QUALIFIER` to force a pass.

- [ ] **Step 6: Lint and commit**

```bash
bun run lint:fix
git add packages/api/src/domain/IngredientStructurer packages/api/src/domain/RuleIngredientStructurer
git commit -m "feat: add IngredientStructurer seam with rule-based implementation"
```

---

### Task 2: Wire RecipeImportService to the structurer

**Files:**
- Modify: `packages/api/src/domain/RecipeImportService/index.ts` (remove `toIngredient`, lines 92-103; change constructor; change `importFromUrl`)
- Test: `packages/api/src/domain/RecipeImportService/index.test.ts` (lines 36, 280, 298, 315 construct the service; lines 147-152 and 165-168 assert ingredients)

**Interfaces:**
- Consumes: `IngredientStructurer`, `ParsedIngredient`, `RuleIngredientStructurer` from Task 1.
- Produces: the new `RecipeImportService` constructor signature `(fetcher, idGenerator, structurer, logger?, llmExtractor?)`. Task 4 wires the DI container against it.

**Note:** the structurer is the **third** positional parameter, before `logger`. All four test construction sites must be updated.

- [ ] **Step 1: Update the existing ingredient assertions to the new expected names**

In `packages/api/src/domain/RecipeImportService/index.test.ts`, the Tier 1 parsing test currently expects `{ id: 'id-4', name: 'salt to taste' }`. Cleaning now strips the trailing qualifier. Change that single entry to:

```ts
                { id: 'id-4', name: 'salt' },
```

Leave the other three entries in that assertion unchanged — `salt`, `garlic`, `eggs` with their pills are already correct.

- [ ] **Step 2: Update the four construction sites and add a fake structurer**

Add near the other test doubles at the top of the file (after `SequentialIdGenerator`):

```ts
class ThrowingStructurer implements IngredientStructurer {
    readonly strategy = 'llm' as const;

    async structure(): Promise<ParsedIngredient[]> {
        throw Object.assign(new Error('LLM ingredient structuring failed'), { status: 502 });
    }
}
```

Add to the imports at the top of the file:

```ts
import type { IngredientStructurer, ParsedIngredient } from '../IngredientStructurer/types';
import { RuleIngredientStructurer } from '../RuleIngredientStructurer';
```

Then update each construction site to pass a structurer as the third argument:

- Line 36: `service = new RecipeImportService(fetcher, new SequentialIdGenerator(), new RuleIngredientStructurer());`
- Lines 280, 298, 315: insert `new RuleIngredientStructurer(),` as the third argument, keeping the existing `undefined` logger and extractor arguments in their now-shifted positions.

- [ ] **Step 3: Write the failing propagation test**

Add a new `describe` block at the end of `packages/api/src/domain/RecipeImportService/index.test.ts`:

```ts
    describe('ingredient structuring', () => {
        it('propagates a structurer failure instead of swallowing it', async () => {
            fetcher.html = jsonLdPage({
                '@type': 'Recipe',
                name: 'Boom',
                recipeIngredient: ['1 onion', '2 carrots'],
                recipeInstructions: ['Do it.'],
            });
            const failing = new RecipeImportService(fetcher, new SequentialIdGenerator(), new ThrowingStructurer());

            await expect(failing.importFromUrl('https://example.com/boom')).rejects.toMatchObject({ status: 502 });
        });
    });
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `bun run --filter @shoppingo/api test src/domain/RecipeImportService`
Expected: FAIL — `RecipeImportService` takes no third structurer argument; `salt to taste` still returned.

- [ ] **Step 5: Update the service**

In `packages/api/src/domain/RecipeImportService/index.ts`:

Remove the `parse-ingredient` import and the `Ingredient` import stays. Add:

```ts
import type { IngredientStructurer } from '../IngredientStructurer/types';
```

Change the constructor to:

```ts
    constructor(
        private readonly fetcher: PageFetcher,
        private readonly idGenerator: IdGenerator,
        private readonly structurer: IngredientStructurer,
        private readonly logger?: Logger,
        private readonly llmExtractor?: RecipeTextExtractor
    ) {}
```

Delete the entire `toIngredient` method (lines 92-103, including its leading comment block).

In `importFromUrl`, replace the `return` statement with a structuring step that logs, then maps ids on:

```ts
        const started = Date.now();
        const structured = await this.structurer.structure(draft.ingredients);
        this.logger?.info('Recipe import structured ingredients', {
            strategy: this.structurer.strategy,
            lineCount: draft.ingredients.length,
            durationMs: Date.now() - started,
        });

        return {
            title: draft.title,
            ingredients: structured.map((parsed) => ({ id: this.idGenerator.generate(), ...parsed })),
            instructions: draft.instructions,
            link: draft.link,
            ...(draft.image !== undefined && { image: draft.image }),
            ...(draft.prepTime !== undefined && { prepTime: draft.prepTime }),
            ...(draft.cookTime !== undefined && { cookTime: draft.cookTime }),
            ...(draft.recipeYield !== undefined && { recipeYield: draft.recipeYield }),
        };
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test src/domain/RecipeImportService`
Expected: PASS, all existing tiers plus the new propagation test.

- [ ] **Step 7: Type-check, lint, commit**

```bash
bun run tsc --noEmit
bun run lint:fix
git add packages/api/src/domain/RecipeImportService
git commit -m "refactor: delegate ingredient structuring out of RecipeImportService"
```

---

### Task 3: FalIngredientStructurer

**Files:**
- Create: `packages/api/src/infrastructure/FalIngredientStructurer/index.ts`
- Test: `packages/api/src/infrastructure/FalIngredientStructurer/index.test.ts`

**Interfaces:**
- Consumes: `IngredientStructurer`, `ParsedIngredient` from Task 1.
- Produces: `FalIngredientStructurer` and `FalIngredientStructurerOptions` (`{ model?: string; timeoutMs?: number }`). Constructor is `(apiKey: string, options?: FalIngredientStructurerOptions)`. Task 4 registers it.

Mirror `packages/api/src/infrastructure/FalRecipeExtractor/index.ts` closely — same endpoint, same auth header shape, same defensive JSON extraction. The behavioural difference is error handling: this class **throws** where the extractor would tolerate.

- [ ] **Step 1: Write the failing test**

Create `packages/api/src/infrastructure/FalIngredientStructurer/index.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'bun:test';

import { FalIngredientStructurer } from './index';

const originalFetch = globalThis.fetch;

const stubFetch = (impl: typeof fetch) => {
    globalThis.fetch = impl as typeof fetch;
};

const okResponse = (output: string) =>
    new Response(JSON.stringify({ output }), { headers: { 'content-type': 'application/json' } });

describe('FalIngredientStructurer', () => {
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('reports the llm strategy', () => {
        expect(new FalIngredientStructurer('secret').strategy).toBe('llm');
    });

    it('throws 500 when no api key is configured', async () => {
        await expect(new FalIngredientStructurer('').structure(['1 onion'])).rejects.toMatchObject({ status: 500 });
    });

    it('short-circuits without calling fetch for no lines', async () => {
        let called = false;
        stubFetch(async () => {
            called = true;
            return okResponse('[]');
        });

        expect(await new FalIngredientStructurer('secret').structure([])).toEqual([]);
        expect(called).toBe(false);
    });

    it('sends the model and Key auth header and parses clean JSON', async () => {
        let sentBody: Record<string, unknown> = {};
        let authHeader: string | null = null;
        stubFetch(async (_url, init) => {
            authHeader = new Headers(init?.headers).get('authorization');
            sentBody = JSON.parse(init?.body as string);
            return okResponse('[{"name":"spaghetti","quantity":350,"unit":"g"},{"name":"black pepper"}]');
        });

        const result = await new FalIngredientStructurer('secret', { model: 'google/gemini-2.5-flash-lite' }).structure(
            ['350 g spaghetti (- 12 oz)', 'freshly ground black pepper (- to taste)']
        );

        expect(authHeader).toBe('Key secret');
        expect(sentBody.model).toBe('google/gemini-2.5-flash-lite');
        expect(sentBody.temperature).toBe(0);
        expect(result).toEqual([{ name: 'spaghetti', quantity: 350, unit: 'g' }, { name: 'black pepper' }]);
    });

    it('extracts a JSON array wrapped in prose or code fences', async () => {
        stubFetch(async () => okResponse('Sure:\n```json\n[{"name":"onion","quantity":1,"unit":"pcs"}]\n```'));

        const result = await new FalIngredientStructurer('secret').structure(['1 onion']);

        expect(result).toEqual([{ name: 'onion', quantity: 1, unit: 'pcs' }]);
    });

    it('throws 502 when the response contains no JSON array', async () => {
        stubFetch(async () => okResponse('I could not parse that.'));

        await expect(new FalIngredientStructurer('secret').structure(['1 onion'])).rejects.toMatchObject({
            status: 502,
        });
    });

    it('throws 502 when the array length does not match the input', async () => {
        stubFetch(async () => okResponse('[{"name":"onion"}]'));

        await expect(
            new FalIngredientStructurer('secret').structure(['1 onion', '2 carrots'])
        ).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when an entry has no usable name', async () => {
        stubFetch(async () => okResponse('[{"quantity":1}]'));

        await expect(new FalIngredientStructurer('secret').structure(['1 onion'])).rejects.toMatchObject({
            status: 502,
        });
    });

    it('throws 502 on a non-OK response', async () => {
        stubFetch(async () => new Response('upstream boom', { status: 500 }));

        await expect(new FalIngredientStructurer('secret').structure(['1 onion'])).rejects.toMatchObject({
            status: 502,
        });
    });

    it('throws 502 when the api reports an error in the body', async () => {
        stubFetch(
            async () =>
                new Response(JSON.stringify({ error: 'rate limited' }), {
                    headers: { 'content-type': 'application/json' },
                })
        );

        await expect(new FalIngredientStructurer('secret').structure(['1 onion'])).rejects.toMatchObject({
            status: 502,
        });
    });

    it('throws 502 when fetch rejects', async () => {
        stubFetch(async () => {
            throw new Error('network down');
        });

        await expect(new FalIngredientStructurer('secret').structure(['1 onion'])).rejects.toMatchObject({
            status: 502,
        });
    });

    it('drops a non-numeric quantity rather than emitting NaN', async () => {
        stubFetch(async () => okResponse('[{"name":"onion","quantity":"one","unit":"pcs"}]'));

        const result = await new FalIngredientStructurer('secret').structure(['one onion']);

        expect(result).toEqual([{ name: 'onion' }]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test src/infrastructure/FalIngredientStructurer`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: Write the implementation**

Create `packages/api/src/infrastructure/FalIngredientStructurer/index.ts`:

```ts
import type { IngredientStructurer, ParsedIngredient } from '../../domain/IngredientStructurer/types';

export interface FalIngredientStructurerOptions {
    model?: string;
    timeoutMs?: number;
}

const SYSTEM_PROMPT =
    'You normalise recipe ingredient lines. You receive a JSON array of raw ingredient strings. Reply with ONLY a ' +
    'compact JSON array containing exactly one object per input string, in the same order, of the shape ' +
    '{"name": string, "quantity"?: number, "unit"?: string}. "name" is the bare ingredient: no measurements, no ' +
    'parenthetical text, no qualifiers such as "to taste", "optional" or "divided". Include "quantity" and "unit" ' +
    'only when the line states a measurement; use "pcs" as the unit for a bare count. Never merge, split, drop or ' +
    'reorder lines. Output no prose, no markdown, no code fences.';

const bad = (message: string): Error => Object.assign(new Error(message), { status: 502 });

export class FalIngredientStructurer implements IngredientStructurer {
    readonly strategy = 'llm' as const;

    private readonly model: string;
    private readonly timeoutMs: number;

    constructor(
        private readonly apiKey: string,
        options: FalIngredientStructurerOptions = {}
    ) {
        this.model = options.model ?? 'google/gemini-2.5-flash-lite';
        this.timeoutMs = options.timeoutMs ?? 15000;
    }

    async structure(lines: string[]): Promise<ParsedIngredient[]> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Recipe import LLM not configured'), { status: 500 });
        }
        if (lines.length === 0) return [];

        const output = await this.callModel(lines);
        return this.parseOutput(output, lines.length);
    }

    private async callModel(lines: string[]): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        let response: Response;
        try {
            response = await fetch('https://fal.run/fal-ai/any-llm', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Key ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    system_prompt: SYSTEM_PROMPT,
                    prompt: `Normalise these ingredient lines:\n\n${JSON.stringify(lines)}`,
                    temperature: 0,
                }),
            });
        } catch (error) {
            // Unlike the Tier 3 extractor, structuring has no draft to fall back on: fail loudly.
            throw bad(`fal.ai any-llm request failed: ${(error as Error).message}`);
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            throw bad(`fal.ai any-llm error: ${await response.text()}`);
        }

        const data = (await response.json()) as { output?: string; error?: string };
        if (data.error) {
            throw bad(`fal.ai any-llm error: ${data.error}`);
        }
        return data.output ?? '';
    }

    // The model may wrap JSON in prose or code fences; pull out the first JSON array and validate the contract.
    private parseOutput(output: string, expected: number): ParsedIngredient[] {
        const start = output.indexOf('[');
        const end = output.lastIndexOf(']');
        if (start === -1 || end === -1 || end <= start) {
            throw bad('LLM returned no JSON array');
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(output.slice(start, end + 1));
        } catch {
            throw bad('LLM returned malformed JSON');
        }

        if (!Array.isArray(parsed) || parsed.length !== expected) {
            throw bad(`LLM returned ${Array.isArray(parsed) ? parsed.length : 0} ingredients, expected ${expected}`);
        }

        return parsed.map((entry) => this.toParsedIngredient(entry));
    }

    private toParsedIngredient(entry: unknown): ParsedIngredient {
        const obj = (entry ?? {}) as Record<string, unknown>;
        const name = typeof obj.name === 'string' ? obj.name.trim() : '';
        if (!name) {
            throw bad('LLM returned an ingredient with no name');
        }

        const hasQuantity = typeof obj.quantity === 'number' && Number.isFinite(obj.quantity);
        const unit = typeof obj.unit === 'string' && obj.unit.trim() ? obj.unit.trim() : 'pcs';

        return {
            name,
            ...(hasQuantity && { quantity: obj.quantity as number }),
            ...(hasQuantity && { unit }),
        };
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test src/infrastructure/FalIngredientStructurer`
Expected: PASS, 12 tests

- [ ] **Step 5: Lint and commit**

```bash
bun run lint:fix
git add packages/api/src/infrastructure/FalIngredientStructurer
git commit -m "feat: add fal.ai LLM ingredient structurer"
```

---

### Task 4: Config flag and DI wiring

**Files:**
- Modify: `packages/api/src/config/index.ts:11` (after `recipeImportLlmEnabled`)
- Modify: `packages/api/src/dependencies/types.ts:58` (token enum) and its `DependencyMap`
- Modify: `packages/api/src/dependencies/index.ts:352-369` (the `RecipeImportService` registration)
- Modify: `.env`

**Interfaces:**
- Consumes: `RuleIngredientStructurer` (Task 1), the `RecipeImportService` constructor (Task 2), `FalIngredientStructurer` (Task 3).
- Produces: nothing downstream. This is the final task.

- [ ] **Step 1: Add the config key**

In `packages/api/src/config/index.ts`, directly after the `recipeImportLlmEnabled` line:

```ts
    recipeImportLlmIngredients: { parser: parsers.boolean, from: 'RECIPE_IMPORT_LLM_INGREDIENTS', optional: true },
```

- [ ] **Step 2: Add the dependency tokens**

In `packages/api/src/dependencies/types.ts`, add to the `DependencyToken` enum next to `RecipeTextExtractor`:

```ts
    RuleIngredientStructurer = 'RuleIngredientStructurer',
    LlmIngredientStructurer = 'LlmIngredientStructurer',
```

Add the import:

```ts
import type { IngredientStructurer } from '../domain/IngredientStructurer/types';
```

And add to the dependency map interface, next to the `RecipeImportService` entry:

```ts
    [DependencyToken.RuleIngredientStructurer]: IngredientStructurer;
    [DependencyToken.LlmIngredientStructurer]: IngredientStructurer;
```

- [ ] **Step 3: Register both structurers and select on the flag**

In `packages/api/src/dependencies/index.ts`, add the imports:

```ts
import { RuleIngredientStructurer } from '../domain/RuleIngredientStructurer';
import { FalIngredientStructurer } from '../infrastructure/FalIngredientStructurer';
```

Insert these two registrations immediately before the existing `RecipeImportService` registration (which starts at line 352):

```ts
    dependencyContainer.registerSingleton(
        DependencyToken.RuleIngredientStructurer,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new RuleIngredientStructurer();
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.LlmIngredientStructurer,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                // Reuses FAL_KEY unless a dedicated import key is set, matching RecipeTextExtractor.
                return new FalIngredientStructurer(config.get('recipeImportLlmApiKey') || config.get('falKey') || '', {
                    ...(config.get('recipeImportLlmModel') && { model: config.get('recipeImportLlmModel') }),
                });
            }
        }
    );
```

Then replace the body of the `RecipeImportService` registration constructor with:

```ts
            constructor() {
                // Tier 3 is opt-in: only inject the LLM extractor when explicitly enabled.
                const llmExtractor = config.get('recipeImportLlmEnabled')
                    ? dependencyContainer.resolve(DependencyToken.RecipeTextExtractor)
                    : undefined;
                // Structuring defaults to rules; the LLM path is an evaluation opt-in that fails imports loudly.
                const structurer = config.get('recipeImportLlmIngredients')
                    ? dependencyContainer.resolve(DependencyToken.LlmIngredientStructurer)
                    : dependencyContainer.resolve(DependencyToken.RuleIngredientStructurer);
                return new RecipeImportService(
                    dependencyContainer.resolve(DependencyToken.PageFetcher),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    structurer,
                    dependencyContainer.resolve(DependencyToken.Logger),
                    llmExtractor
                );
            }
```

- [ ] **Step 4: Document the flag**

Append to `.env`, next to the other `RECIPE_IMPORT_*` entries:

```
# Structure imported ingredients with an LLM instead of parse-ingredient.
# Evaluation only: when true, a fal.ai outage makes every recipe import fail with a 502.
RECIPE_IMPORT_LLM_INGREDIENTS=false
```

- [ ] **Step 5: Verify the whole suite, types and builds**

```bash
bun run tsc --noEmit
bun run --filter @shoppingo/api test
bun run --filter @shoppingo/api build
```

Expected: type-check clean, all tests pass, coverage at or above the 90% threshold, build succeeds.

- [ ] **Step 6: Verify against the real recipe end-to-end**

Start the API (`bun run start:api`) with `RECIPE_IMPORT_LLM_INGREDIENTS=false`, then import
`https://www.recipesfromitaly.com/spaghetti-carbonara-original-recipe/` through the create-recipe page.

Expected ingredient names, with pills unchanged:

```
spaghetti                          350 g
guanciale                          200 g
whole eggs                         4 pcs
finely grated Pecorino Romano DOP  100 g
freshly ground black pepper        (no pill)
```

Then restart with `RECIPE_IMPORT_LLM_INGREDIENTS=true` and import the same URL. Compare names and check the API log line for `strategy: "llm"` and its `durationMs`. That comparison is the entire point of the flag.

- [ ] **Step 7: Lint and commit**

```bash
bun run lint:fix
git add packages/api/src/config packages/api/src/dependencies .env
git commit -m "feat: add RECIPE_IMPORT_LLM_INGREDIENTS flag to select ingredient structurer"
```

---

## Self-Review Notes

Checked against `docs/superpowers/specs/2026-07-10-ingredient-structuring-design.md`:

- Seam + `ParsedIngredient` → Task 1. Contract (one-per-line, ordered, throw otherwise) enforced in Task 3 Step 3 and tested in Task 3 Step 1.
- Rule implementation, parse-then-strip, all parentheticals stripped, empty-name fallback → Task 1.
- `toIngredient` removed, service delegates → Task 2.
- Fal implementation, batched, `temperature: 0`, 15s timeout, credential reuse → Task 3.
- Throws 502 on network error, non-OK, malformed JSON, length mismatch → Task 3 tests.
- Flag orthogonal to `RECIPE_IMPORT_LLM_ENABLED`, off by default → Task 4.
- Observability (`strategy`, `lineCount`, `durationMs`) → Task 2 Step 5; `strategy` lives on the interface (Task 1) so the service can log it without knowing the implementation.
- Testing plan (carbonara fixture, `1 (14 oz) can`, stubbed fetch, fake structurer, propagation) → Tasks 1-3.

Type consistency: `IngredientStructurer` / `ParsedIngredient` / `strategy` / `structure()` used identically in all four tasks. `FalIngredientStructurerOptions` matches `FalRecipeExtractorOptions` in shape.
