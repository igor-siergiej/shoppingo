# LLM-First Parsing — Revised Tasks 3-5

> **Supersedes** Tasks 3 and 4 of `docs/superpowers/plans/2026-07-10-ingredient-structuring.md`.
> Tasks 1 and 2 of that plan are complete and unchanged (commits `97a150e..46357ba`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One new flag, `RECIPE_IMPORT_LLM_FIRST`. When on, the page's JSON-LD document is handed to an LLM which returns the whole recipe — title, instructions, and already-clean structured ingredients. When off, the existing three-tier parse runs with the rule-based name cleanup from Task 1.

**Why the change:** the original plan had the LLM structuring ingredient *strings* that the three-tier parse had already extracted. The user wants the LLM to do the parsing itself. `RECIPE_IMPORT_LLM_INGREDIENTS` and `FalIngredientStructurer` are **dropped**; nothing was built for them.

## What Tasks 1-2 already gave us (do not rebuild)

- `domain/IngredientStructurer/types.ts`: `ParsedIngredient { name: string; quantity?: number; unit?: string }` and `IngredientStructurer { readonly strategy: 'rule' | 'llm'; structure(lines: string[]): Promise<ParsedIngredient[]> }`
- `domain/RuleIngredientStructurer/index.ts`: `class RuleIngredientStructurer`, zero-arg constructor. Strips parentheticals (balanced, nested, stray) and trailing qualifiers.
- `RecipeImportService` constructor is `(fetcher, idGenerator, structurer, logger?, llmExtractor?)` and delegates ingredient structuring to the injected structurer.

## Global Constraints

- Package manager is **Bun**. Never `npm` or `yarn`.
- Tests import from `bun:test` only. No Vitest, no Jest.
- API test coverage threshold is 90%.
- Lint with `bunx biome check --write <changed files>`. Never `bun run lint:fix` — it is repo-wide and `--unsafe`.
- Every `.rejects` assertion must be `await`ed. A floating `.rejects` silently passes.
- Commits follow Conventional Commits, body ends with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Commit only the files each task names. Never `git add .` — unrelated untracked files exist.
- The API suite has exactly 2 known pre-existing failures (auth network-mock, ImageService prom-client double-registration). Not regressions.

## Decisions (settled — do not revisit)

1. **LLM failure fails the import (502).** No silent fallback to the three tiers. A fallback would mask how often the LLM path breaks, defeating the evaluation the flag exists for.
2. **No JSON-LD on the page → send cleaned page text.** Still LLM-first. The flag must not silently no-op on the sites where scraping is hardest.
3. **The LLM's ingredient names are trusted as-is.** Do not re-run `RuleIngredientStructurer` over them. Whether the model cleans names better than the regex *is the experiment*.
4. **Metadata (image, prepTime, cookTime, recipeYield) still comes from scraping**, not the LLM. The recipe image matters and JSON-LD/`og:image` already give it reliably and for free.
5. `RECIPE_IMPORT_LLM_ENABLED` (the pre-existing Tier-3 fallback flag) is **untouched** and orthogonal.

## File Structure

**Create**
- `packages/api/src/infrastructure/FalRecipeParser/index.ts` + `index.test.ts`

**Modify**
- `packages/api/src/domain/RecipeImportService/types.ts` — add `RecipeParser`, `ParsedRecipe`
- `packages/api/src/domain/RecipeImportService/index.ts` — LLM-first branch, metadata helper, source picker; fix the id-spread ordering
- `packages/api/src/domain/RecipeImportService/index.test.ts` — LLM-first tests
- `packages/api/src/config/index.ts` — `recipeImportLlmFirst`
- `packages/api/src/dependencies/types.ts` — `RecipeParser` token + map entry
- `packages/api/src/dependencies/index.ts` — register `FalRecipeParser`; **fix the stale 4-arg `RecipeImportService` construction** (currently passes `Logger` into the `structurer` slot — the branch is runtime-broken until this lands)
- `.env` — document `RECIPE_IMPORT_LLM_FIRST`

---

### Task 3: FalRecipeParser

**Files:**
- Modify: `packages/api/src/domain/RecipeImportService/types.ts`
- Create: `packages/api/src/infrastructure/FalRecipeParser/index.ts`
- Test: `packages/api/src/infrastructure/FalRecipeParser/index.test.ts`

**Interfaces:**
- Consumes: `ParsedIngredient` from `domain/IngredientStructurer/types`.
- Produces: `RecipeParser { parse(source: string): Promise<ParsedRecipe> }`, `ParsedRecipe { title: string; ingredients: ParsedIngredient[]; instructions: string[] }`, and `class FalRecipeParser` with constructor `(apiKey: string, options?: FalRecipeParserOptions)` where `FalRecipeParserOptions = { model?: string; timeoutMs?: number }`. Tasks 4 and 5 depend on these exact names.

Mirror `packages/api/src/infrastructure/FalRecipeExtractor/index.ts` — same endpoint, same `Key` auth header, same defensive JSON extraction. The behavioural difference: this class **throws** where the extractor tolerates.

- [ ] **Step 1: Add the interface**

Append to `packages/api/src/domain/RecipeImportService/types.ts`:

```ts
import type { ParsedIngredient } from '../IngredientStructurer/types';

/** A recipe parsed directly out of a page's structured data by an LLM, ingredients already structured. */
export interface ParsedRecipe {
    title: string;
    ingredients: ParsedIngredient[];
    instructions: string[];
}

export interface RecipeParser {
    /** Parse a recipe from a JSON-LD document or plain page text. Throws with a `status` field on failure. */
    parse(source: string): Promise<ParsedRecipe>;
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/api/src/infrastructure/FalRecipeParser/index.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'bun:test';

import { FalRecipeParser } from './index';

const originalFetch = globalThis.fetch;

const stubFetch = (impl: typeof fetch) => {
    globalThis.fetch = impl as typeof fetch;
};

const okResponse = (output: string) =>
    new Response(JSON.stringify({ output }), { headers: { 'content-type': 'application/json' } });

const CLEAN = JSON.stringify({
    title: 'Spaghetti Carbonara',
    ingredients: [
        { name: 'spaghetti', quantity: 350, unit: 'g' },
        { name: 'freshly ground black pepper' },
    ],
    instructions: ['Boil the pasta.', 'Fry the guanciale.'],
});

describe('FalRecipeParser', () => {
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('throws 500 when no api key is configured', async () => {
        await expect(new FalRecipeParser('').parse('{}')).rejects.toMatchObject({ status: 500 });
    });

    it('throws 502 when the source is empty', async () => {
        await expect(new FalRecipeParser('secret').parse('   ')).rejects.toMatchObject({ status: 502 });
    });

    it('sends the model and Key auth header and parses clean JSON', async () => {
        let sentBody: Record<string, unknown> = {};
        let authHeader: string | null = null;
        stubFetch(async (_url, init) => {
            authHeader = new Headers(init?.headers).get('authorization');
            sentBody = JSON.parse(init?.body as string);
            return okResponse(CLEAN);
        });

        const result = await new FalRecipeParser('secret', { model: 'google/gemini-2.5-flash-lite' }).parse('{"a":1}');

        expect(authHeader).toBe('Key secret');
        expect(sentBody.model).toBe('google/gemini-2.5-flash-lite');
        expect(sentBody.temperature).toBe(0);
        expect(result).toEqual({
            title: 'Spaghetti Carbonara',
            ingredients: [{ name: 'spaghetti', quantity: 350, unit: 'g' }, { name: 'freshly ground black pepper' }],
            instructions: ['Boil the pasta.', 'Fry the guanciale.'],
        });
    });

    it('extracts JSON wrapped in prose or code fences', async () => {
        stubFetch(async () => okResponse(`Here you go:\n\`\`\`json\n${CLEAN}\n\`\`\``));

        const result = await new FalRecipeParser('secret').parse('{"a":1}');

        expect(result.title).toBe('Spaghetti Carbonara');
        expect(result.ingredients).toHaveLength(2);
    });

    it('defaults unit to pcs when a quantity is given without a unit', async () => {
        stubFetch(async () =>
            okResponse('{"title":"X","ingredients":[{"name":"eggs","quantity":4}],"instructions":["Do."]}')
        );

        const result = await new FalRecipeParser('secret').parse('{"a":1}');

        expect(result.ingredients).toEqual([{ name: 'eggs', quantity: 4, unit: 'pcs' }]);
    });

    it('drops a non-numeric quantity rather than emitting NaN', async () => {
        stubFetch(async () =>
            okResponse('{"title":"X","ingredients":[{"name":"onion","quantity":"one","unit":"pcs"}],"instructions":["Do."]}')
        );

        const result = await new FalRecipeParser('secret').parse('{"a":1}');

        expect(result.ingredients).toEqual([{ name: 'onion' }]);
    });

    it('throws 502 when the response contains no JSON object', async () => {
        stubFetch(async () => okResponse('I could not parse that.'));

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when the JSON is malformed', async () => {
        stubFetch(async () => okResponse('{"title":"X","ingredients":[}'));

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when ingredients is not an array', async () => {
        stubFetch(async () => okResponse('{"title":"X","ingredients":"nope","instructions":["Do."]}'));

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when ingredients is empty', async () => {
        stubFetch(async () => okResponse('{"title":"X","ingredients":[],"instructions":["Do."]}'));

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when an ingredient has no usable name', async () => {
        stubFetch(async () => okResponse('{"title":"X","ingredients":[{"quantity":1}],"instructions":["Do."]}'));

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 on a non-OK response', async () => {
        stubFetch(async () => new Response('upstream boom', { status: 500 }));

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when the api reports an error in the body', async () => {
        stubFetch(
            async () =>
                new Response(JSON.stringify({ error: 'rate limited' }), {
                    headers: { 'content-type': 'application/json' },
                })
        );

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when fetch rejects', async () => {
        stubFetch(async () => {
            throw new Error('network down');
        });

        await expect(new FalRecipeParser('secret').parse('{"a":1}')).rejects.toMatchObject({ status: 502 });
    });

    it('keeps instructions as strings and drops non-string entries', async () => {
        stubFetch(async () =>
            okResponse('{"title":"X","ingredients":[{"name":"salt"}],"instructions":["Do.",5,"Then."]}')
        );

        const result = await new FalRecipeParser('secret').parse('{"a":1}');

        expect(result.instructions).toEqual(['Do.', 'Then.']);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run --filter @shoppingo/api test src/infrastructure/FalRecipeParser`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 4: Write the implementation**

Create `packages/api/src/infrastructure/FalRecipeParser/index.ts`:

```ts
import type { ParsedIngredient } from '../../domain/IngredientStructurer/types';
import type { ParsedRecipe, RecipeParser } from '../../domain/RecipeImportService/types';

export interface FalRecipeParserOptions {
    model?: string;
    timeoutMs?: number;
}

const SYSTEM_PROMPT =
    'You extract a single recipe from a JSON-LD document or the plain text of a web page. Reply with ONLY a compact ' +
    'JSON object of the shape {"title": string, "ingredients": [{"name": string, "quantity"?: number, "unit"?: ' +
    'string}], "instructions": [string]}. "name" is the bare ingredient: no measurements, no parenthetical text, and ' +
    'no qualifiers such as "to taste", "optional" or "divided". Include "quantity" and "unit" only when the source ' +
    'states a measurement; use "pcs" as the unit for a bare count. Each instruction is one step. Do not invent ' +
    'content that is not present. Output no prose, no markdown, no code fences.';

const bad = (message: string): Error => Object.assign(new Error(message), { status: 502 });

export class FalRecipeParser implements RecipeParser {
    private readonly model: string;
    private readonly timeoutMs: number;

    constructor(
        private readonly apiKey: string,
        options: FalRecipeParserOptions = {}
    ) {
        this.model = options.model ?? 'google/gemini-2.5-flash-lite';
        this.timeoutMs = options.timeoutMs ?? 15000;
    }

    async parse(source: string): Promise<ParsedRecipe> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Recipe import LLM not configured'), { status: 500 });
        }
        if (!source.trim()) {
            throw bad('No recipe source to parse');
        }

        return this.parseOutput(await this.callModel(source));
    }

    private async callModel(source: string): Promise<string> {
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
                    prompt: `Extract the recipe from this source:\n\n${source}`,
                    temperature: 0,
                }),
            });
        } catch (error) {
            // LLM-first has no draft to fall back on: fail the import loudly.
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

    // The model may wrap JSON in prose or code fences; pull out the first JSON object and validate it.
    private parseOutput(output: string): ParsedRecipe {
        const start = output.indexOf('{');
        const end = output.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw bad('LLM returned no JSON object');
        }

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
        } catch {
            throw bad('LLM returned malformed JSON');
        }

        if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
            throw bad('LLM returned no ingredients');
        }

        return {
            title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
            ingredients: parsed.ingredients.map((entry) => this.toParsedIngredient(entry)),
            instructions: Array.isArray(parsed.instructions)
                ? parsed.instructions.filter((step): step is string => typeof step === 'string')
                : [],
        };
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

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test src/infrastructure/FalRecipeParser`
Expected: PASS, 14 tests

- [ ] **Step 6: Lint and commit**

```bash
bunx biome check --write packages/api/src/infrastructure/FalRecipeParser/index.ts packages/api/src/infrastructure/FalRecipeParser/index.test.ts packages/api/src/domain/RecipeImportService/types.ts
git add packages/api/src/infrastructure/FalRecipeParser packages/api/src/domain/RecipeImportService/types.ts
git commit -m "feat: add fal.ai LLM recipe parser"
```

---

### Task 4: LLM-first branch in RecipeImportService

**Files:**
- Modify: `packages/api/src/domain/RecipeImportService/index.ts`
- Test: `packages/api/src/domain/RecipeImportService/index.test.ts`

**Interfaces:**
- Consumes: `RecipeParser`, `ParsedRecipe` (Task 3); `IngredientStructurer` (Task 1).
- Produces: constructor `(fetcher, idGenerator, structurer, logger?, llmExtractor?, llmParser?)` — `llmParser` appended **last**, so existing construction sites keep working. Task 5 wires it.

When `llmParser` is injected, it wins and the three tiers never run. Injection is how the flag is expressed; the service itself reads no config.

- [ ] **Step 1: Write the failing tests**

Add to `packages/api/src/domain/RecipeImportService/index.test.ts`. Put the fake near the other test doubles:

```ts
class FakeRecipeParser implements RecipeParser {
    calls: string[] = [];
    error: Error | null = null;
    result: ParsedRecipe = { title: '', ingredients: [], instructions: [] };

    async parse(source: string): Promise<ParsedRecipe> {
        this.calls.push(source);
        if (this.error) throw this.error;
        return this.result;
    }
}
```

Add these imports:

```ts
import type { ParsedRecipe, RecipeParser } from './types';
```

Then a new `describe` block at the end of the file:

```ts
    describe('LLM-first parsing', () => {
        let parser: FakeRecipeParser;

        const llmService = () =>
            new RecipeImportService(
                fetcher,
                new SequentialIdGenerator(),
                new RuleIngredientStructurer(),
                undefined,
                undefined,
                parser
            );

        beforeEach(() => {
            parser = new FakeRecipeParser();
        });

        it('sends the JSON-LD recipe node to the parser when the page has one', async () => {
            fetcher.html = jsonLdPage({
                '@type': 'Recipe',
                name: 'Carbonara',
                recipeIngredient: ['350 g spaghetti (- 12 oz)'],
                recipeInstructions: ['Boil.'],
            });
            parser.result = {
                title: 'Carbonara',
                ingredients: [{ name: 'spaghetti', quantity: 350, unit: 'g' }],
                instructions: ['Boil.'],
            };

            const result = await llmService().importFromUrl('https://example.com/c');

            expect(parser.calls).toHaveLength(1);
            expect(parser.calls[0]).toContain('recipeIngredient');
            expect(result.ingredients).toEqual([{ id: 'id-1', name: 'spaghetti', quantity: 350, unit: 'g' }]);
            expect(result.instructions).toEqual(['Boil.']);
            expect(result.title).toBe('Carbonara');
        });

        it('does not clean the names the LLM returned', async () => {
            fetcher.html = jsonLdPage({ '@type': 'Recipe', name: 'X', recipeIngredient: ['a'], recipeInstructions: ['b'] });
            parser.result = {
                title: 'X',
                ingredients: [{ name: 'guanciale (Italian cured pork cheek)' }],
                instructions: ['b'],
            };

            const result = await llmService().importFromUrl('https://example.com/c');

            expect(result.ingredients[0].name).toBe('guanciale (Italian cured pork cheek)');
        });

        it('falls back to page text when the page has no JSON-LD recipe node', async () => {
            fetcher.html = '<html><body><p>Some recipe prose here.</p></body></html>';
            parser.result = { title: 'Prose', ingredients: [{ name: 'salt' }], instructions: ['Do.'] };

            await llmService().importFromUrl('https://example.com/c');

            expect(parser.calls[0]).toContain('Some recipe prose here.');
        });

        it('keeps image and timing metadata scraped from the page', async () => {
            fetcher.html = jsonLdPage({
                '@type': 'Recipe',
                name: 'Carbonara',
                image: 'https://img/c.jpg',
                prepTime: 'PT10M',
                cookTime: 'PT15M',
                recipeYield: '4 servings',
                recipeIngredient: ['350 g spaghetti'],
                recipeInstructions: ['Boil.'],
            });
            parser.result = { title: 'Carbonara', ingredients: [{ name: 'spaghetti' }], instructions: ['Boil.'] };

            const result = await llmService().importFromUrl('https://example.com/c');

            expect(result.image).toBe('https://img/c.jpg');
            expect(result.prepTime).toBe('PT10M');
            expect(result.cookTime).toBe('PT15M');
            expect(result.recipeYield).toBe('4 servings');
        });

        it('propagates a parser failure instead of falling back to the tiers', async () => {
            fetcher.html = jsonLdPage({
                '@type': 'Recipe',
                name: 'Carbonara',
                recipeIngredient: ['1 onion', '2 carrots'],
                recipeInstructions: ['Boil.'],
            });
            parser.error = Object.assign(new Error('llm down'), { status: 502 });

            await expect(llmService().importFromUrl('https://example.com/c')).rejects.toMatchObject({ status: 502 });
        });

        it('never calls the parser when no llmParser is injected', async () => {
            fetcher.html = jsonLdPage({
                '@type': 'Recipe',
                name: 'Carbonara',
                recipeIngredient: ['350 g spaghetti (- 12 oz)'],
                recipeInstructions: ['Boil.'],
            });

            const result = await service.importFromUrl('https://example.com/c');

            expect(parser.calls).toHaveLength(0);
            expect(result.ingredients[0].name).toBe('spaghetti');
        });
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run --filter @shoppingo/api test src/domain/RecipeImportService`
Expected: FAIL — the constructor takes no sixth argument; the parser is never called.

- [ ] **Step 3: Implement the branch**

In `packages/api/src/domain/RecipeImportService/index.ts`:

Add to the type imports:

```ts
import type { PageFetcher, ParsedRecipe, RecipeDraft, RecipeParser, RecipeTextExtractor } from './types';
```

Extend the constructor with a sixth parameter:

```ts
        private readonly llmParser?: RecipeParser
```

At the top of `importFromUrl`, immediately after `const html = await this.fetcher.fetchPage(parsed);`, insert:

```ts
        // LLM-first: injection of a parser IS the flag. The three tiers never run.
        if (this.llmParser) {
            return this.importViaLlm(html, parsed);
        }
```

Fix the id-spread ordering in the existing tier return (a stray `id` on a `ParsedIngredient` must not clobber the generated one):

```ts
            ingredients: structured.map((parsed) => ({ ...parsed, id: this.idGenerator.generate() })),
```

Add these three private methods:

```ts
    private async importViaLlm(html: string, link: string): Promise<RecipeImportResult> {
        const started = Date.now();
        const parsed: ParsedRecipe = await (this.llmParser as RecipeParser).parse(this.llmSource(html));
        this.logger?.info('Recipe import parsed with LLM', {
            strategy: 'llm-first',
            ingredientCount: parsed.ingredients.length,
            durationMs: Date.now() - started,
        });

        return {
            title: parsed.title,
            ingredients: parsed.ingredients.map((ingredient) => ({
                ...ingredient,
                id: this.idGenerator.generate(),
            })),
            instructions: parsed.instructions,
            link,
            ...this.metadataFrom(html),
        };
    }

    // Prefer the page's own JSON-LD recipe node; fall back to page text so the flag never silently no-ops.
    private llmSource(html: string): string {
        const $ = cheerio.load(html);
        for (const block of $('script[type="application/ld+json"]').toArray()) {
            const raw = $(block).text();
            if (!raw.trim()) continue;

            let parsed: unknown;
            try {
                parsed = JSON.parse(raw);
            } catch {
                continue;
            }

            const node = this.findRecipeNode(parsed);
            if (node) return JSON.stringify(node).slice(0, LLM_TEXT_LIMIT);
        }
        return this.htmlToText(html).slice(0, LLM_TEXT_LIMIT);
    }

    // Image and timings stay scraped: they are reliable, free, and not worth an LLM round trip.
    private metadataFrom(html: string): Partial<RecipeDraft> {
        const structured = this.parseJsonLd(html);
        const scraped = this.parseHtml(html);
        const image = structured.image ?? scraped.image;
        const prepTime = structured.prepTime ?? scraped.prepTime;
        const cookTime = structured.cookTime ?? scraped.cookTime;
        const recipeYield = structured.recipeYield ?? scraped.recipeYield;

        return {
            ...(image !== undefined && { image }),
            ...(prepTime !== undefined && { prepTime }),
            ...(cookTime !== undefined && { cookTime }),
            ...(recipeYield !== undefined && { recipeYield }),
        };
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run --filter @shoppingo/api test src/domain/RecipeImportService`
Expected: PASS — the 30 existing tests plus 6 new ones.

- [ ] **Step 5: Type-check, lint, commit**

```bash
bun run tsc --noEmit
bunx biome check --write packages/api/src/domain/RecipeImportService/index.ts packages/api/src/domain/RecipeImportService/index.test.ts
git add packages/api/src/domain/RecipeImportService
git commit -m "feat: parse recipes LLM-first when a parser is injected"
```

---

### Task 5: Config flag, DI wiring, and end-to-end verification

**Files:**
- Modify: `packages/api/src/config/index.ts`
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`
- Modify: `.env`

**Interfaces:**
- Consumes: everything above. Final task.

**This task also repairs a known breakage.** `dependencies/index.ts` still constructs `RecipeImportService` with the old 4-argument signature, so `Logger` currently lands in the `structurer` slot. `resolve()` returns `any`, so `tsc` does not catch it. Recipe import is broken at runtime until this task lands.

- [ ] **Step 1: Add the config key**

In `packages/api/src/config/index.ts`, directly after the `recipeImportLlmEnabled` line:

```ts
    recipeImportLlmFirst: { parser: parsers.boolean, from: 'RECIPE_IMPORT_LLM_FIRST', optional: true },
```

- [ ] **Step 2: Add the dependency token**

In `packages/api/src/dependencies/types.ts`, add the import:

```ts
import type { RecipeParser } from '../domain/RecipeImportService/types';
```

Add to the `DependencyToken` enum next to `RecipeTextExtractor`:

```ts
    RecipeParser = 'RecipeParser',
```

Add to the dependency map interface next to the `RecipeImportService` entry:

```ts
    [DependencyToken.RecipeParser]: RecipeParser;
```

- [ ] **Step 3: Register the parser and repair the service construction**

In `packages/api/src/dependencies/index.ts`, add the imports:

```ts
import { RuleIngredientStructurer } from '../domain/RuleIngredientStructurer';
import { FalRecipeParser } from '../infrastructure/FalRecipeParser';
```

Insert this registration immediately before the existing `RecipeImportService` registration:

```ts
    dependencyContainer.registerSingleton(
        DependencyToken.RecipeParser,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                // Reuses FAL_KEY unless a dedicated import key is set, matching RecipeTextExtractor.
                return new FalRecipeParser(config.get('recipeImportLlmApiKey') || config.get('falKey') || '', {
                    ...(config.get('recipeImportLlmModel') && { model: config.get('recipeImportLlmModel') }),
                });
            }
        }
    );
```

Replace the whole body of the `RecipeImportService` registration constructor with:

```ts
            constructor() {
                // Tier 3 is opt-in: only inject the LLM extractor when explicitly enabled.
                const llmExtractor = config.get('recipeImportLlmEnabled')
                    ? dependencyContainer.resolve(DependencyToken.RecipeTextExtractor)
                    : undefined;
                // LLM-first is opt-in: injecting the parser makes it win over the three tiers.
                const llmParser = config.get('recipeImportLlmFirst')
                    ? dependencyContainer.resolve(DependencyToken.RecipeParser)
                    : undefined;
                return new RecipeImportService(
                    dependencyContainer.resolve(DependencyToken.PageFetcher),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    new RuleIngredientStructurer(),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    llmExtractor,
                    llmParser
                );
            }
```

- [ ] **Step 4: Document the flag**

Append to `.env`, next to the other `RECIPE_IMPORT_*` entries:

```
# Parse imported recipes LLM-first: hand the page's JSON-LD document to the model
# instead of running the three-tier scraper. Evaluation only: when true, a fal.ai
# outage makes every recipe import fail with a 502.
RECIPE_IMPORT_LLM_FIRST=false
```

- [ ] **Step 5: Verify the whole suite, types and builds**

```bash
bun run tsc --noEmit
bun run --filter @shoppingo/api test
bun run --filter @shoppingo/api build
```

Expected: type-check clean, build succeeds, all tests pass except the 2 known pre-existing failures (auth network-mock, ImageService prom-client). Coverage at or above the 90% threshold.

- [ ] **Step 6: Verify against the real recipe end-to-end**

Start the API (`bun run start:api`) with `RECIPE_IMPORT_LLM_FIRST=false`, then import
`https://www.recipesfromitaly.com/spaghetti-carbonara-original-recipe/` through the create-recipe page.

Expected names, with pills unchanged:

```
spaghetti                          350 g
guanciale                          200 g
whole eggs                         4 pcs
finely grated Pecorino Romano DOP  100 g
freshly ground black pepper        (no pill)
```

Then restart with `RECIPE_IMPORT_LLM_FIRST=true` and import the same URL. Compare the names, the instructions, and the API log line (`strategy: "llm-first"`, `durationMs`). That comparison is the entire point of the flag.

- [ ] **Step 7: Lint and commit**

```bash
bunx biome check --write packages/api/src/config/index.ts packages/api/src/dependencies/types.ts packages/api/src/dependencies/index.ts
git add packages/api/src/config packages/api/src/dependencies .env
git commit -m "feat: add RECIPE_IMPORT_LLM_FIRST flag and repair import service wiring"
```

---

## Self-Review Notes

- One new flag, `RECIPE_IMPORT_LLM_FIRST` → Task 5. `RECIPE_IMPORT_LLM_INGREDIENTS` never existed; nothing to remove.
- Flag off → the exact three-tier path plus Task 1's rule cleanup. Covered by the "never calls the parser" test in Task 4 and by the 30 pre-existing tests.
- Flag on → JSON-LD document to the LLM (Task 4 `llmSource`), page text when absent (tested), 502 on failure with no tier fallback (tested).
- The stale 4-arg DI construction from Task 2 is repaired in Task 5 Step 3, and the id-spread ordering Minor in Task 4 Step 3.
- `FalRecipeParser` mirrors `FalRecipeExtractor`'s shape; the divergence (throw vs tolerate) is deliberate and tested.
- Type consistency: `RecipeParser`, `ParsedRecipe`, `ParsedIngredient`, `FalRecipeParserOptions` used identically across Tasks 3-5.
