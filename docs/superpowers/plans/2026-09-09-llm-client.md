# Shared LLM Client for Recipe Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fal.ai `any-llm` transport and defensive JSON parsing duplicated across `FalRecipeExtractor` and `FalRecipeParser` with one `FalLlmClient` that does zod-validated structured completion with retry-on-invalid.

**Architecture:** A new infrastructure class `FalLlmClient` owns the HTTP request, timeout, error handling, JSON-object extraction, schema validation, and a bounded retry loop that re-prompts the model with the validation error. The two existing recipe classes keep their domain interface, directory, and prompt, but shrink to: declare a zod schema, build a user prompt, delegate to the client. The zod schemas are exported and unit-tested directly. Wiring is one new DI token resolved into the two existing factories.

**Tech Stack:** TypeScript (strict), Bun 1.3.9, `bun:test`, zod v4, `@imapps/api-utils` (`Logger`, DI container), fal.ai `fal-ai/any-llm` HTTP endpoint.

**Spec:** `docs/superpowers/specs/2026-09-09-llm-client-design.md`

## Global Constraints

- **zod version:** `^4.1.11` — match `packages/web/package.json` exactly.
- **Error contract, never change:** every failure path throws an `Error` carrying a `status` number property — `500` with message `Recipe import LLM not configured` when the api key is empty, `502` for every other failure (network, timeout, non-OK response, non-JSON body, `data.error`, no JSON object after retries, schema-invalid after retries). `RecipeImportService` and the HTTP handler depend on this.
- **fal endpoint:** `https://fal.run/fal-ai/any-llm`, header `Authorization: Key <apiKey>`, body `{ model, system_prompt, prompt, temperature }`. fal returns `{ output?: string, error?: string }` — no token usage.
- **Default model:** `google/gemini-2.5-flash-lite`. **Default temperature:** `0`. **Default timeout:** `15000` ms. **Default maxAttempts:** `2`.
- **Tests:** `bun:test`, colocated as `index.test.ts`, stub `globalThis.fetch` and restore it in `afterEach`. Two pre-existing unrelated failures (auth network-mock, `ImageService` prom-client) are expected — everything else must pass.
- **Style:** 4-space indent, single quotes, trailing commas. Run `bunx biome check --write <changed paths>` before every commit.
- **Commands, run from `packages/api/`:** one test file `bun test <path>`; all `bun test`; types `bun run tsc --noEmit`; build `bun run build`. From repo root, all api tests: `bun run --filter @shoppingo/api test`.
- Commit after each task with a Conventional Commits message.

---

### Task 1: FalLlmClient core — request, extract, validate (single attempt)

**Files:**
- Modify: `packages/api/package.json` — add `"zod": "^4.1.11"` to `dependencies`
- Create: `packages/api/src/infrastructure/FalLlmClient/index.ts`
- Test: `packages/api/src/infrastructure/FalLlmClient/index.test.ts`

**Interfaces:**
- Consumes: `Logger` from `@imapps/api-utils` (`info(message: string, ...meta: unknown[]) => void`).
- Produces:
  - `class FalLlmClient` with `constructor(apiKey: string, logger?: Logger, defaults?: { model?: string })`
  - `completeStructured<T>(opts: CompleteStructuredOptions<T>): Promise<LlmResult<T>>`
  - `interface CompleteStructuredOptions<T> { operation: string; schema: ZodType<T>; system: string; prompt: string; model?: string; temperature?: number; timeoutMs?: number; maxAttempts?: number }`
  - `interface LlmResult<T> { value: T; meta: { operation: string; model: string; attempts: number; latencyMs: number } }`

- [ ] **Step 1: Add zod to the api package**

Edit `packages/api/package.json`, adding to `dependencies` (keep alphabetical order — after `web-push`? no; zod is last alphabetically, add it as the final entry):

```json
    "web-push": "^3.6.7",
    "zod": "^4.1.11"
```

Then from `packages/api/`:

```bash
bun install
```

- [ ] **Step 2: Write the failing test for the happy path**

Create `packages/api/src/infrastructure/FalLlmClient/index.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'bun:test';
import { z } from 'zod';

import { FalLlmClient } from './index';

const originalFetch = globalThis.fetch;

const stubFetch = (impl: typeof fetch) => {
    globalThis.fetch = impl as typeof fetch;
};

const okResponse = (output: string) =>
    new Response(JSON.stringify({ output }), { headers: { 'content-type': 'application/json' } });

const schema = z.object({ title: z.string(), count: z.number() });

const call = (client: FalLlmClient, overrides: Partial<Parameters<FalLlmClient['completeStructured']>[0]> = {}) =>
    client.completeStructured({
        operation: 'test.op',
        schema,
        system: 'SYS',
        prompt: 'PROMPT',
        ...overrides,
    });

describe('FalLlmClient', () => {
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('sends model, system prompt, temperature and Key auth, and returns the validated value', async () => {
        let url: string | undefined;
        let auth: string | null = null;
        let body: Record<string, unknown> = {};
        stubFetch(async (u, init) => {
            url = String(u);
            auth = new Headers(init?.headers).get('authorization');
            body = JSON.parse(init?.body as string);
            return okResponse('{"title":"Hi","count":3}');
        });

        const result = await call(new FalLlmClient('secret', undefined, { model: 'google/gemini-2.5-flash-lite' }));

        expect(url).toBe('https://fal.run/fal-ai/any-llm');
        expect(auth).toBe('Key secret');
        expect(body.model).toBe('google/gemini-2.5-flash-lite');
        expect(body.system_prompt).toBe('SYS');
        expect(body.prompt).toBe('PROMPT');
        expect(body.temperature).toBe(0);
        expect(result.value).toEqual({ title: 'Hi', count: 3 });
        expect(result.meta).toMatchObject({ operation: 'test.op', model: 'google/gemini-2.5-flash-lite', attempts: 1 });
        expect(typeof result.meta.latencyMs).toBe('number');
    });

    it('falls back to the default model when none is configured', async () => {
        let body: Record<string, unknown> = {};
        stubFetch(async (_u, init) => {
            body = JSON.parse(init?.body as string);
            return okResponse('{"title":"x","count":1}');
        });

        await call(new FalLlmClient('secret'));

        expect(body.model).toBe('google/gemini-2.5-flash-lite');
    });

    it('extracts a JSON object wrapped in prose or code fences', async () => {
        stubFetch(async () => okResponse('Sure:\n```json\n{"title":"x","count":1}\n```\nhope that helps'));

        const result = await call(new FalLlmClient('secret'));

        expect(result.value).toEqual({ title: 'x', count: 1 });
    });

    it('throws 500 when the api key is empty', async () => {
        stubFetch(async () => okResponse('{"title":"x","count":1}'));

        await expect(call(new FalLlmClient(''))).rejects.toMatchObject({
            status: 500,
            message: 'Recipe import LLM not configured',
        });
    });

    it('throws 502 on a non-OK response, without retrying', async () => {
        let calls = 0;
        stubFetch(async () => {
            calls += 1;
            return new Response('upstream boom', { status: 500 });
        });

        await expect(call(new FalLlmClient('secret'))).rejects.toMatchObject({ status: 502 });
        expect(calls).toBe(1);
    });

    it('throws 502 when the body reports an error field', async () => {
        stubFetch(async () =>
            new Response(JSON.stringify({ error: 'rate limited' }), { headers: { 'content-type': 'application/json' } })
        );

        await expect(call(new FalLlmClient('secret'))).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when a 200 response has a non-JSON body', async () => {
        stubFetch(async () => new Response('not json', { headers: { 'content-type': 'text/plain' } }));

        await expect(call(new FalLlmClient('secret'))).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when fetch rejects (network / abort)', async () => {
        stubFetch(async () => {
            throw new DOMException('aborted', 'AbortError');
        });

        await expect(call(new FalLlmClient('secret'))).rejects.toMatchObject({ status: 502 });
    });

    it('applies the schema transform to the output', async () => {
        const trimSchema = z.object({ name: z.string().transform((s) => s.trim()) });
        stubFetch(async () => okResponse('{"name":"  spaced  "}'));

        const result = await new FalLlmClient('secret').completeStructured({
            operation: 'test.op',
            schema: trimSchema,
            system: 'SYS',
            prompt: 'PROMPT',
        });

        expect(result.value).toEqual({ name: 'spaced' });
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test src/infrastructure/FalLlmClient/index.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 4: Write the minimal implementation**

Create `packages/api/src/infrastructure/FalLlmClient/index.ts`:

```ts
import type { Logger } from '@imapps/api-utils';
import { type ZodError, type ZodType } from 'zod';

const FAL_ANY_LLM_URL = 'https://fal.run/fal-ai/any-llm';
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
const DEFAULT_TEMPERATURE = 0;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_ATTEMPTS = 2;

const fail = (message: string): Error => Object.assign(new Error(message), { status: 502 });

export interface CompleteStructuredOptions<T> {
    /** Identifies the call in logs, e.g. 'recipe.parse'. */
    operation: string;
    /** Output is parsed against this. `.transform()` is honoured. */
    schema: ZodType<T>;
    system: string;
    prompt: string;
    /** Falls back to the client's configured model, then DEFAULT_MODEL. */
    model?: string;
    temperature?: number;
    timeoutMs?: number;
    /** Total attempts including the first. */
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

type Outcome = 'ok' | 'invalid' | 'error';

type JsonExtraction = { ok: true; value: unknown } | { ok: false; issues: string };

const extractJsonObject = (output: string): JsonExtraction => {
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        return { ok: false, issues: 'no JSON object found in the reply' };
    }
    try {
        return { ok: true, value: JSON.parse(output.slice(start, end + 1)) as unknown };
    } catch {
        return { ok: false, issues: 'the JSON object was malformed' };
    }
};

const flattenZodIssues = (error: ZodError): string =>
    error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');

export class FalLlmClient {
    constructor(
        private readonly apiKey: string,
        private readonly logger?: Logger,
        private readonly defaults: { model?: string } = {}
    ) {}

    async completeStructured<T>(opts: CompleteStructuredOptions<T>): Promise<LlmResult<T>> {
        const model = opts.model ?? this.defaults.model ?? DEFAULT_MODEL;
        const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;
        const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);

        const started = Date.now();
        let lastIssues = '';
        let lastOutput = '';

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const prompt =
                attempt === 1
                    ? opts.prompt
                    : `${opts.prompt}\n\nYour previous reply failed validation: ${lastIssues}. Return only corrected JSON, no prose.`;

            let output: string;
            try {
                output = await this.request(model, opts.system, prompt, temperature, timeoutMs);
            } catch (error) {
                this.log(opts.operation, model, attempt, Date.now() - started, 'error', opts.prompt.length, lastOutput.length);
                throw error;
            }
            lastOutput = output;

            const json = extractJsonObject(output);
            if (!json.ok) {
                lastIssues = json.issues;
                continue;
            }

            const parsed = opts.schema.safeParse(json.value);
            if (parsed.success) {
                const latencyMs = Date.now() - started;
                this.log(opts.operation, model, attempt, latencyMs, 'ok', opts.prompt.length, output.length);
                return { value: parsed.data, meta: { operation: opts.operation, model, attempts: attempt, latencyMs } };
            }
            lastIssues = flattenZodIssues(parsed.error);
        }

        this.log(opts.operation, model, maxAttempts, Date.now() - started, 'invalid', opts.prompt.length, lastOutput.length);
        throw fail(`LLM output failed validation after ${maxAttempts} attempts: ${lastIssues}`);
    }

    private async request(
        model: string,
        system: string,
        prompt: string,
        temperature: number,
        timeoutMs: number
    ): Promise<string> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Recipe import LLM not configured'), { status: 500 });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response: Response;
        try {
            response = await fetch(FAL_ANY_LLM_URL, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Key ${this.apiKey}`,
                },
                body: JSON.stringify({ model, system_prompt: system, prompt, temperature }),
            });
        } catch (error) {
            throw fail(`fal.ai any-llm request failed: ${(error as Error).message}`);
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) {
            let detail: string;
            try {
                detail = await response.text();
            } catch {
                detail = `HTTP ${response.status}`;
            }
            throw fail(`fal.ai any-llm error: ${detail}`);
        }

        let data: { output?: string; error?: string };
        try {
            data = (await response.json()) as { output?: string; error?: string };
        } catch {
            throw fail('fal.ai any-llm returned a non-JSON response body');
        }

        if (data.error) {
            throw fail(`fal.ai any-llm error: ${data.error}`);
        }
        return data.output ?? '';
    }

    private log(
        operation: string,
        model: string,
        attempts: number,
        latencyMs: number,
        outcome: Outcome,
        promptChars: number,
        outputChars: number
    ): void {
        this.logger?.info('llm call', { operation, model, attempts, latencyMs, outcome, promptChars, outputChars });
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test src/infrastructure/FalLlmClient/index.test.ts`
Expected: PASS, all 8 cases. (The retry path is exercised in Task 2.)

- [ ] **Step 6: Typecheck**

Run: `bun run tsc --noEmit`
Expected: clean. If zod's `ZodType<T>` inference complains where `safeParse` returns `parsed.data`, confirm the import is `import { type ZodError, type ZodType } from 'zod'` and that `zod` resolved (`bun pm ls | grep zod`).

- [ ] **Step 7: Lint and commit**

```bash
bunx biome check --write packages/api/package.json packages/api/src/infrastructure/FalLlmClient/
git add packages/api/package.json bun.lock packages/api/src/infrastructure/FalLlmClient/
git commit -m "feat(api): add FalLlmClient for structured fal any-llm completion"
```

---

### Task 2: FalLlmClient retry-on-invalid

**Files:**
- Modify: `packages/api/src/infrastructure/FalLlmClient/index.test.ts` (add cases; implementation from Task 1 already contains the loop)

**Interfaces:**
- Consumes: `FalLlmClient.completeStructured` from Task 1.
- Produces: nothing new — this task proves the retry behaviour already written.

- [ ] **Step 1: Add the failing retry tests**

Append inside the `describe('FalLlmClient', ...)` block in `packages/api/src/infrastructure/FalLlmClient/index.test.ts`:

```ts
    it('retries once when the first reply has no JSON, then succeeds', async () => {
        const bodies: string[] = [];
        let n = 0;
        stubFetch(async (_u, init) => {
            bodies.push((JSON.parse(init?.body as string) as { prompt: string }).prompt);
            n += 1;
            return okResponse(n === 1 ? 'I could not do that' : '{"title":"x","count":1}');
        });

        const result = await call(new FalLlmClient('secret'));

        expect(result.value).toEqual({ title: 'x', count: 1 });
        expect(result.meta.attempts).toBe(2);
        expect(bodies).toHaveLength(2);
        expect(bodies[1]).toContain('failed validation');
        expect(bodies[1]).toContain('no JSON object found');
    });

    it('retries when the reply is valid JSON but fails the schema, feeding back the zod issue', async () => {
        const bodies: string[] = [];
        let n = 0;
        stubFetch(async (_u, init) => {
            bodies.push((JSON.parse(init?.body as string) as { prompt: string }).prompt);
            n += 1;
            return okResponse(n === 1 ? '{"title":"x"}' : '{"title":"x","count":2}');
        });

        const result = await call(new FalLlmClient('secret'));

        expect(result.value).toEqual({ title: 'x', count: 2 });
        expect(bodies[1]).toContain('count');
    });

    it('throws 502 after maxAttempts invalid replies, message names the attempt count', async () => {
        let n = 0;
        stubFetch(async () => {
            n += 1;
            return okResponse('{"title":"x"}');
        });

        await expect(call(new FalLlmClient('secret'))).rejects.toMatchObject({
            status: 502,
            message: expect.stringContaining('failed validation after 2 attempts'),
        });
        expect(n).toBe(2);
    });

    it('honours an explicit maxAttempts', async () => {
        let n = 0;
        stubFetch(async () => {
            n += 1;
            return okResponse('nope');
        });

        await expect(call(new FalLlmClient('secret'), { maxAttempts: 3 })).rejects.toMatchObject({ status: 502 });
        expect(n).toBe(3);
    });

    it('does not retry a transport error', async () => {
        let n = 0;
        stubFetch(async () => {
            n += 1;
            return new Response('boom', { status: 503 });
        });

        await expect(call(new FalLlmClient('secret'))).rejects.toMatchObject({ status: 502 });
        expect(n).toBe(1);
    });
```

- [ ] **Step 2: Run the tests**

Run: `bun test src/infrastructure/FalLlmClient/index.test.ts`
Expected: PASS — all cases, new and old. If "retries when the reply is valid JSON but fails the schema" fails because the feedback string does not contain `count`, check `flattenZodIssues` joins `issue.path` — zod v4 reports the missing key with `path: ['count']`.

- [ ] **Step 3: Commit**

```bash
bunx biome check --write packages/api/src/infrastructure/FalLlmClient/index.test.ts
git add packages/api/src/infrastructure/FalLlmClient/index.test.ts
git commit -m "test(api): cover FalLlmClient retry-on-invalid"
```

---

### Task 3: Recipe zod schemas

**Files:**
- Create: `packages/api/src/infrastructure/FalRecipeParser/schema.ts`
- Test: `packages/api/src/infrastructure/FalRecipeParser/schema.test.ts`
- Create: `packages/api/src/infrastructure/FalRecipeExtractor/schema.ts`
- Test: `packages/api/src/infrastructure/FalRecipeExtractor/schema.test.ts`

**Interfaces:**
- Consumes: `ParsedRecipe`, `ParsedIngredient` from `../../domain/RecipeImportService/types` and `../../domain/IngredientStructurer/types`.
- Produces:
  - `parsedRecipeSchema` — `ZodType` whose output satisfies `ParsedRecipe` (`{ title: string; ingredients: ParsedIngredient[]; instructions: string[] }`)
  - `extractedRecipeSchema` — `ZodType` whose output is `{ title: string; ingredients: string[]; instructions: string[] }`

- [ ] **Step 1: Write the failing parser-schema test**

Create `packages/api/src/infrastructure/FalRecipeParser/schema.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';

import { parsedRecipeSchema } from './schema';

const parse = (input: unknown) => parsedRecipeSchema.parse(input);

describe('parsedRecipeSchema', () => {
    it('keeps clean ingredients with name, quantity and unit', () => {
        const result = parse({
            title: 'Spaghetti Carbonara',
            ingredients: [{ name: 'spaghetti', quantity: 350, unit: 'g' }, { name: 'freshly ground black pepper' }],
            instructions: ['Boil the pasta.', 'Fry the guanciale.'],
        });

        expect(result).toEqual({
            title: 'Spaghetti Carbonara',
            ingredients: [{ name: 'spaghetti', quantity: 350, unit: 'g' }, { name: 'freshly ground black pepper' }],
            instructions: ['Boil the pasta.', 'Fry the guanciale.'],
        });
    });

    it('trims the title, and coerces a non-string title to an empty string', () => {
        expect(parse({ title: '  Soup  ', ingredients: [{ name: 'water' }], instructions: [] }).title).toBe('Soup');
        expect(parse({ title: 42, ingredients: [{ name: 'water' }], instructions: [] }).title).toBe('');
        expect(parse({ ingredients: [{ name: 'water' }], instructions: [] }).title).toBe('');
    });

    it('defaults the unit to pcs when a quantity is given without one', () => {
        const result = parse({ title: 'X', ingredients: [{ name: 'eggs', quantity: 4 }], instructions: ['Do.'] });
        expect(result.ingredients).toEqual([{ name: 'eggs', quantity: 4, unit: 'pcs' }]);
    });

    it('drops a non-numeric quantity rather than emitting NaN', () => {
        const result = parse({
            title: 'X',
            ingredients: [{ name: 'onion', quantity: 'one', unit: 'pcs' }],
            instructions: ['Do.'],
        });
        expect(result.ingredients).toEqual([{ name: 'onion' }]);
    });

    it('keeps a zero quantity rather than dropping it as falsy', () => {
        const result = parse({
            title: 'X',
            ingredients: [{ name: 'salt', quantity: 0, unit: 'g' }],
            instructions: ['Do.'],
        });
        expect(result.ingredients).toEqual([{ name: 'salt', quantity: 0, unit: 'g' }]);
    });

    it('drops non-string instruction entries', () => {
        const result = parse({
            title: 'X',
            ingredients: [{ name: 'salt' }],
            instructions: ['Do.', 5, 'Then.'],
        });
        expect(result.instructions).toEqual(['Do.', 'Then.']);
    });

    it('defaults instructions to an empty array when absent or wrong-typed', () => {
        expect(parse({ title: 'X', ingredients: [{ name: 'salt' }] }).instructions).toEqual([]);
        expect(parse({ title: 'X', ingredients: [{ name: 'salt' }], instructions: 'nope' }).instructions).toEqual([]);
    });

    it('rejects a missing, non-array or empty ingredients list', () => {
        expect(() => parse({ title: 'X', instructions: [] })).toThrow();
        expect(() => parse({ title: 'X', ingredients: 'nope', instructions: [] })).toThrow();
        expect(() => parse({ title: 'X', ingredients: [], instructions: [] })).toThrow();
    });

    it('rejects an ingredient with no usable name', () => {
        expect(() => parse({ title: 'X', ingredients: [{ quantity: 1 }], instructions: [] })).toThrow();
        expect(() => parse({ title: 'X', ingredients: [{ name: '   ' }], instructions: [] })).toThrow();
    });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `bun test src/infrastructure/FalRecipeParser/schema.test.ts`
Expected: FAIL — `Cannot find module './schema'`.

- [ ] **Step 3: Implement the parser schema**

Create `packages/api/src/infrastructure/FalRecipeParser/schema.ts`:

```ts
import { z } from 'zod';

import type { ParsedRecipe } from '../../domain/RecipeImportService/types';

const ingredientSchema = z
    .object({
        name: z.string(),
        quantity: z.number().finite().optional().catch(undefined),
        unit: z.string().optional().catch(undefined),
    })
    .transform((raw, ctx) => {
        const name = raw.name.trim();
        if (!name) {
            ctx.addIssue({ code: 'custom', message: 'ingredient has no name' });
            return z.NEVER;
        }
        if (raw.quantity === undefined) {
            return { name };
        }
        const unit = raw.unit && raw.unit.trim() ? raw.unit.trim() : 'pcs';
        return { name, quantity: raw.quantity, unit };
    });

const toStringArray = (value: Array<unknown> | undefined): string[] =>
    (value ?? []).filter((entry): entry is string => typeof entry === 'string');

export const parsedRecipeSchema: z.ZodType<ParsedRecipe> = z.object({
    title: z.unknown().transform((value) => (typeof value === 'string' ? value.trim() : '')),
    ingredients: z.array(ingredientSchema).min(1),
    instructions: z.array(z.unknown()).optional().catch(undefined).transform(toStringArray),
});
```

- [ ] **Step 4: Run it, verify it passes**

Run: `bun test src/infrastructure/FalRecipeParser/schema.test.ts`
Expected: PASS. If `z.ZodType<ParsedRecipe>` annotation causes a variance error from the transforms, drop the annotation and instead append `satisfies z.ZodType<unknown>` is not enough — leave it unannotated and rely on Task 4's return-type check.

- [ ] **Step 5: Write the failing extractor-schema test**

Create `packages/api/src/infrastructure/FalRecipeExtractor/schema.test.ts`:

```ts
import { describe, expect, it } from 'bun:test';

import { extractedRecipeSchema } from './schema';

const parse = (input: unknown) => extractedRecipeSchema.parse(input);

describe('extractedRecipeSchema', () => {
    it('keeps string arrays as-is and leaves the title untrimmed', () => {
        const result = parse({ title: ' Soup ', ingredients: ['1 onion', '2 carrots'], instructions: ['Boil.'] });
        expect(result).toEqual({ title: ' Soup ', ingredients: ['1 onion', '2 carrots'], instructions: ['Boil.'] });
    });

    it('coerces missing or wrong-typed fields to safe defaults', () => {
        expect(parse({ ingredients: 'not-an-array' })).toEqual({ title: '', ingredients: [], instructions: [] });
        expect(parse({})).toEqual({ title: '', ingredients: [], instructions: [] });
    });

    it('drops non-string entries from the arrays', () => {
        const result = parse({ title: 'X', ingredients: ['a', 2, 'b'], instructions: [true, 'step'] });
        expect(result).toEqual({ title: 'X', ingredients: ['a', 'b'], instructions: ['step'] });
    });
});
```

- [ ] **Step 6: Run it, verify it fails**

Run: `bun test src/infrastructure/FalRecipeExtractor/schema.test.ts`
Expected: FAIL — `Cannot find module './schema'`.

- [ ] **Step 7: Implement the extractor schema**

Create `packages/api/src/infrastructure/FalRecipeExtractor/schema.ts`:

```ts
import { z } from 'zod';

const toStringArray = (value: Array<unknown> | undefined): string[] =>
    (value ?? []).filter((entry): entry is string => typeof entry === 'string');

export const extractedRecipeSchema = z.object({
    title: z.unknown().transform((value) => (typeof value === 'string' ? value : '')),
    ingredients: z.array(z.unknown()).optional().catch(undefined).transform(toStringArray),
    instructions: z.array(z.unknown()).optional().catch(undefined).transform(toStringArray),
});
```

- [ ] **Step 8: Run it, verify it passes**

Run: `bun test src/infrastructure/FalRecipeExtractor/schema.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck, lint, commit**

```bash
bun run tsc --noEmit
bunx biome check --write packages/api/src/infrastructure/FalRecipeParser/ packages/api/src/infrastructure/FalRecipeExtractor/
git add packages/api/src/infrastructure/FalRecipeParser/ packages/api/src/infrastructure/FalRecipeExtractor/
git commit -m "feat(api): add zod schemas for recipe parse and extract output"
```

---

### Task 4: Retrofit FalRecipeParser onto FalLlmClient

**Files:**
- Modify: `packages/api/src/infrastructure/FalRecipeParser/index.ts` (full rewrite of the class body; keep the file, the `SYSTEM_PROMPT`, the `FalRecipeParserOptions` interface, the `RecipeParser` implements clause)
- Modify: `packages/api/src/infrastructure/FalRecipeParser/index.test.ts` (rewrite around a fake client)

**Interfaces:**
- Consumes: `FalLlmClient` + `LlmResult` (Task 1); `parsedRecipeSchema` (Task 3); `RecipeParser`, `ParsedRecipe` from `../../domain/RecipeImportService/types`.
- Produces: `class FalRecipeParser implements RecipeParser` with `constructor(client: FalLlmClient, options?: FalRecipeParserOptions)` and `parse(source: string): Promise<ParsedRecipe>`.

- [ ] **Step 1: Rewrite the test around a fake client**

Replace the entire contents of `packages/api/src/infrastructure/FalRecipeParser/index.test.ts`:

```ts
import { describe, expect, it, mock } from 'bun:test';

import type { FalLlmClient, LlmResult } from '../FalLlmClient';
import { FalRecipeParser } from './index';

type CompleteArgs = Parameters<FalLlmClient['completeStructured']>[0];

const fakeClient = (impl: (args: CompleteArgs) => Promise<LlmResult<unknown>>) =>
    ({ completeStructured: mock(impl) }) as unknown as FalLlmClient;

const result = <T>(value: T): LlmResult<T> => ({
    value,
    meta: { operation: 'recipe.parse', model: 'm', attempts: 1, latencyMs: 1 },
});

describe('FalRecipeParser', () => {
    it('throws 502 when the source is empty, without calling the client', async () => {
        const complete = mock(async () => result({}));
        const parser = new FalRecipeParser({ completeStructured: complete } as unknown as FalLlmClient);

        await expect(parser.parse('   ')).rejects.toMatchObject({ status: 502 });
        expect(complete).not.toHaveBeenCalled();
    });

    it('calls the client with operation recipe.parse, the parsed-recipe schema and the source in the prompt', async () => {
        let seen: CompleteArgs | undefined;
        const client = fakeClient(async (args) => {
            seen = args;
            return result({ title: 'Carbonara', ingredients: [{ name: 'spaghetti', quantity: 350, unit: 'g' }], instructions: ['Boil.'] });
        });

        const parsed = await new FalRecipeParser(client).parse('{"@type":"Recipe"}');

        expect(seen?.operation).toBe('recipe.parse');
        expect(seen?.system).toContain('extract a single recipe');
        expect(seen?.prompt).toContain('{"@type":"Recipe"}');
        expect(seen?.schema).toBeDefined();
        expect(parsed).toEqual({
            title: 'Carbonara',
            ingredients: [{ name: 'spaghetti', quantity: 350, unit: 'g' }],
            instructions: ['Boil.'],
        });
    });

    it('propagates a client error unchanged', async () => {
        const client = fakeClient(async () => {
            throw Object.assign(new Error('fal.ai any-llm error: rate limited'), { status: 502 });
        });

        await expect(new FalRecipeParser(client).parse('src')).rejects.toMatchObject({ status: 502 });
    });

    it('passes an explicit model and timeout through to the client', async () => {
        let seen: CompleteArgs | undefined;
        const client = fakeClient(async (args) => {
            seen = args;
            return result({ title: 'X', ingredients: [{ name: 'salt' }], instructions: [] });
        });

        await new FalRecipeParser(client, { model: 'anthropic/claude-3-haiku', timeoutMs: 8000 }).parse('src');

        expect(seen?.model).toBe('anthropic/claude-3-haiku');
        expect(seen?.timeoutMs).toBe(8000);
    });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `bun test src/infrastructure/FalRecipeParser/index.test.ts`
Expected: FAIL — the current constructor takes `(apiKey: string, ...)`, so `new FalRecipeParser(client)` type-errors and the behaviour assertions fail.

- [ ] **Step 3: Rewrite the class**

Replace `packages/api/src/infrastructure/FalRecipeParser/index.ts`:

```ts
import type { ParsedRecipe, RecipeParser } from '../../domain/RecipeImportService/types';
import type { FalLlmClient } from '../FalLlmClient';
import { parsedRecipeSchema } from './schema';

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
    private readonly model?: string;
    private readonly timeoutMs?: number;

    constructor(
        private readonly client: FalLlmClient,
        options: FalRecipeParserOptions = {}
    ) {
        this.model = options.model;
        this.timeoutMs = options.timeoutMs;
    }

    // Invoked through the RecipeParser interface via the DI container; fallow can't trace that indirection.
    // fallow-ignore-next-line unused-class-member
    async parse(source: string): Promise<ParsedRecipe> {
        if (!source.trim()) {
            throw bad('No recipe source to parse');
        }

        const { value } = await this.client.completeStructured({
            operation: 'recipe.parse',
            schema: parsedRecipeSchema,
            system: SYSTEM_PROMPT,
            prompt: `Extract the recipe from this source:\n\n${source}`,
            ...(this.model !== undefined && { model: this.model }),
            ...(this.timeoutMs !== undefined && { timeoutMs: this.timeoutMs }),
        });
        return value;
    }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `bun test src/infrastructure/FalRecipeParser/`
Expected: PASS — both `index.test.ts` and `schema.test.ts`.

- [ ] **Step 5: Typecheck**

Run: `bun run tsc --noEmit`
Expected: clean. If `value` (the schema output) is not assignable to `ParsedRecipe` because of the transforms, change the schema line in `schema.ts` to build the object explicitly typed — wrap the whole `z.object({...})` in `.transform((r): ParsedRecipe => r)` as the last step — then re-run. Do not use `as`.

- [ ] **Step 6: Lint and commit**

```bash
bunx biome check --write packages/api/src/infrastructure/FalRecipeParser/
git add packages/api/src/infrastructure/FalRecipeParser/
git commit -m "refactor(api): FalRecipeParser delegates transport to FalLlmClient"
```

---

### Task 5: Retrofit FalRecipeExtractor onto FalLlmClient

**Files:**
- Modify: `packages/api/src/infrastructure/FalRecipeExtractor/index.ts` (full rewrite of the class body; keep `SYSTEM_PROMPT`, `FalRecipeExtractorOptions`, the local `ExtractedRecipe` interface, the `RecipeTextExtractor` implements clause)
- Modify: `packages/api/src/infrastructure/FalRecipeExtractor/index.test.ts` (rewrite around a fake client)

**Interfaces:**
- Consumes: `FalLlmClient` + `LlmResult` (Task 1); `extractedRecipeSchema` (Task 3); `RecipeTextExtractor` from `../../domain/RecipeImportService/types`.
- Produces: `class FalRecipeExtractor implements RecipeTextExtractor` with `constructor(client: FalLlmClient, options?: FalRecipeExtractorOptions)` and `extract(text: string): Promise<ExtractedRecipe>`.

- [ ] **Step 1: Rewrite the test around a fake client**

Replace the entire contents of `packages/api/src/infrastructure/FalRecipeExtractor/index.test.ts`:

```ts
import { describe, expect, it, mock } from 'bun:test';

import type { FalLlmClient, LlmResult } from '../FalLlmClient';
import { FalRecipeExtractor } from './index';

type CompleteArgs = Parameters<FalLlmClient['completeStructured']>[0];

const fakeClient = (impl: (args: CompleteArgs) => Promise<LlmResult<unknown>>) =>
    ({ completeStructured: mock(impl) }) as unknown as FalLlmClient;

const result = <T>(value: T): LlmResult<T> => ({
    value,
    meta: { operation: 'recipe.extract', model: 'm', attempts: 1, latencyMs: 1 },
});

describe('FalRecipeExtractor', () => {
    it('calls the client with operation recipe.extract, the extracted-recipe schema and the page text in the prompt', async () => {
        let seen: CompleteArgs | undefined;
        const client = fakeClient(async (args) => {
            seen = args;
            return result({ title: 'Soup', ingredients: ['1 onion'], instructions: ['Boil.'] });
        });

        const extracted = await new FalRecipeExtractor(client).extract('page text here');

        expect(seen?.operation).toBe('recipe.extract');
        expect(seen?.system).toContain('extract a single recipe');
        expect(seen?.prompt).toContain('page text here');
        expect(seen?.schema).toBeDefined();
        expect(extracted).toEqual({ title: 'Soup', ingredients: ['1 onion'], instructions: ['Boil.'] });
    });

    it('propagates a client error unchanged', async () => {
        const client = fakeClient(async () => {
            throw Object.assign(new Error('fal.ai any-llm error: boom'), { status: 502 });
        });

        await expect(new FalRecipeExtractor(client).extract('text')).rejects.toMatchObject({ status: 502 });
    });

    it('passes an explicit model and timeout through to the client', async () => {
        let seen: CompleteArgs | undefined;
        const client = fakeClient(async (args) => {
            seen = args;
            return result({ title: '', ingredients: [], instructions: [] });
        });

        await new FalRecipeExtractor(client, { model: 'x/y', timeoutMs: 9000 }).extract('text');

        expect(seen?.model).toBe('x/y');
        expect(seen?.timeoutMs).toBe(9000);
    });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `bun test src/infrastructure/FalRecipeExtractor/index.test.ts`
Expected: FAIL — constructor signature mismatch.

- [ ] **Step 3: Rewrite the class**

Replace `packages/api/src/infrastructure/FalRecipeExtractor/index.ts`:

```ts
import type { RecipeTextExtractor } from '../../domain/RecipeImportService/types';
import type { FalLlmClient } from '../FalLlmClient';
import { extractedRecipeSchema } from './schema';

export interface FalRecipeExtractorOptions {
    model?: string;
    timeoutMs?: number;
}

const SYSTEM_PROMPT =
    'You extract a single recipe from the plain text of a web page. Reply with ONLY a compact JSON object of the ' +
    'shape {"title": string, "ingredients": string[], "instructions": string[]}. Each ingredient is one full line ' +
    '(quantity, unit and item together). Each instruction is one step. Do not invent content that is not present. ' +
    'If a field is unknown use an empty string or empty array. Output no prose, no markdown, no code fences.';

interface ExtractedRecipe {
    title: string;
    ingredients: string[];
    instructions: string[];
}

export class FalRecipeExtractor implements RecipeTextExtractor {
    private readonly model?: string;
    private readonly timeoutMs?: number;

    constructor(
        private readonly client: FalLlmClient,
        options: FalRecipeExtractorOptions = {}
    ) {
        this.model = options.model;
        this.timeoutMs = options.timeoutMs;
    }

    async extract(text: string): Promise<ExtractedRecipe> {
        const { value } = await this.client.completeStructured({
            operation: 'recipe.extract',
            schema: extractedRecipeSchema,
            system: SYSTEM_PROMPT,
            prompt: `Extract the recipe from this page text:\n\n${text}`,
            ...(this.model !== undefined && { model: this.model }),
            ...(this.timeoutMs !== undefined && { timeoutMs: this.timeoutMs }),
        });
        return value;
    }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `bun test src/infrastructure/FalRecipeExtractor/`
Expected: PASS — `index.test.ts` and `schema.test.ts`.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
bun run tsc --noEmit
bunx biome check --write packages/api/src/infrastructure/FalRecipeExtractor/
git add packages/api/src/infrastructure/FalRecipeExtractor/
git commit -m "refactor(api): FalRecipeExtractor delegates transport to FalLlmClient"
```

---

### Task 6: Dependency wiring

**Files:**
- Modify: `packages/api/src/dependencies/types.ts` — add `FalLlmClient` to the `DependencyToken` enum and the `Dependencies` type map
- Modify: `packages/api/src/dependencies/index.ts` — register the `FalLlmClient` singleton; change the `RecipeTextExtractor` and `RecipeParser` singletons to resolve and inject it

**Interfaces:**
- Consumes: `FalLlmClient` (Task 1), the rewritten `FalRecipeExtractor` / `FalRecipeParser` (Tasks 4–5), existing config keys `recipeImportLlmApiKey`, `falKey`, `recipeImportLlmModel`.
- Produces: `DependencyToken.FalLlmClient` resolving to a `FalLlmClient` instance.

- [ ] **Step 1: Add the token and type-map entry**

In `packages/api/src/dependencies/types.ts`:

Add the import near the other infrastructure type imports:

```ts
import type { FalLlmClient } from '../infrastructure/FalLlmClient';
```

Add to the `DependencyToken` enum, immediately before `RecipeTextExtractor`:

```ts
    FalLlmClient = 'FalLlmClient',
```

Add to the `Dependencies` type, immediately before the `RecipeTextExtractor` line:

```ts
    [DependencyToken.FalLlmClient]: FalLlmClient;
```

- [ ] **Step 2: Register the singleton and inject it**

In `packages/api/src/dependencies/index.ts`:

Add the import near the other `infrastructure/Fal*` imports:

```ts
import { FalLlmClient } from '../infrastructure/FalLlmClient';
```

Add this registration immediately before the `DependencyToken.RecipeTextExtractor` registration:

```ts
    dependencyContainer.registerSingleton(
        DependencyToken.FalLlmClient,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                // Reuses FAL_KEY unless a dedicated import key is set.
                return new FalLlmClient(
                    config.get('recipeImportLlmApiKey') || config.get('falKey') || '',
                    dependencyContainer.resolve(DependencyToken.Logger),
                    { model: config.get('recipeImportLlmModel') || undefined }
                );
            }
        }
    );
```

Replace the body of the `DependencyToken.RecipeTextExtractor` registration's `constructor`:

```ts
            constructor() {
                return new FalRecipeExtractor(dependencyContainer.resolve(DependencyToken.FalLlmClient));
            }
```

Replace the body of the `DependencyToken.RecipeParser` registration's `constructor`:

```ts
            constructor() {
                return new FalRecipeParser(dependencyContainer.resolve(DependencyToken.FalLlmClient));
            }
```

- [ ] **Step 3: Typecheck**

Run: `bun run tsc --noEmit`
Expected: clean. The two factories no longer reference `config.get('recipeImportLlmModel')` directly — that moved into the `FalLlmClient` registration. If `config` is now reported unused in a factory, that is fine; it is still used elsewhere in the file.

- [ ] **Step 4: Full api test run**

Run: `bun test`
Expected: PASS except the two known pre-existing failures (auth network-mock, `ImageService` prom-client). No new failures. The `FalRecipeExtractor` / `FalRecipeParser` / `FalLlmClient` / schema suites all green.

- [ ] **Step 5: Build**

Run: `bun run build`
Expected: succeeds (`cp -r src build`).

- [ ] **Step 6: Lint and commit**

```bash
bunx biome check --write packages/api/src/dependencies/
git add packages/api/src/dependencies/
git commit -m "feat(api): wire FalLlmClient into recipe import DI"
```

---

### Task 7: Verification and cleanup

**Files:**
- Verify only; no new production code. Possibly delete `packages/api/src/infrastructure/FalRecipeParser/index.ts`'s now-unused imports (caught by lint) — already handled per task.

**Interfaces:**
- Consumes: everything above.
- Produces: a verified branch.

- [ ] **Step 1: Confirm no stray fal transport code remains**

Run from `packages/api/`:

```bash
grep -rn "fal.run/fal-ai/any-llm" src/
```

Expected: exactly one hit — `src/infrastructure/FalLlmClient/index.ts`. If `FalRecipeExtractor` or `FalRecipeParser` still contain it, their rewrite in Task 4/5 was incomplete.

- [ ] **Step 2: Confirm the error contract is intact**

Run:

```bash
grep -rn "status: 500\|status: 502\|status = 500\|status = 502" src/infrastructure/FalLlmClient/ src/infrastructure/FalRecipeParser/ src/infrastructure/FalRecipeExtractor/
```

Expected: `FalLlmClient` throws `500` (empty key) and `502` (all else); `FalRecipeParser` throws `502` (empty source); `FalRecipeExtractor` throws none of its own.

- [ ] **Step 3: Full typecheck, test, build**

Run from repo root:

```bash
bun run --filter @shoppingo/api test
```

Then from `packages/api/`:

```bash
bun run tsc --noEmit
bun run build
```

Expected: types clean, build ok, tests green except the two known pre-existing failures.

- [ ] **Step 4: Confirm `.env` and config are untouched**

Run:

```bash
git diff --stat main -- .env packages/api/src/config/index.ts
```

Expected: no output — this work adds no config keys and no env vars.

- [ ] **Step 5: Manual end-to-end check against a real recipe**

With a real `FAL_KEY` in `.env` and `RECIPE_IMPORT_LLM_FIRST=true`, start the API (`bun run start:api` from repo root) and import
`https://www.recipesfromitaly.com/spaghetti-carbonara-original-recipe/` through the create-recipe page.

Expected: the recipe imports; ingredient names are bare (`spaghetti`, `guanciale`, …) with quantity/unit pills intact; the API log shows one `llm call` line with `operation: "recipe.parse"`, `outcome: "ok"`, an `attempts` count and a `latencyMs`. Then set `RECIPE_IMPORT_LLM_FIRST=false` and confirm imports still work through the three-tier path (no `llm call` line).

- [ ] **Step 6: Final commit if anything changed**

```bash
git status
# if clean, nothing to do; otherwise:
bunx biome check --write packages/api/
git add -A
git commit -m "chore(api): tidy after FalLlmClient extraction"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| `FalLlmClient` interface (`completeStructured`, `CompleteStructuredOptions`, `LlmResult`) | Task 1 |
| transport owned once: request, auth, timeout, error handling, JSON-object extraction | Task 1 |
| transport errors not retried | Task 1 (tests), Task 2 (test), Task 7 step 2 |
| schema validation via zod | Task 3 (schemas), Task 1 (client applies `safeParse`) |
| retry with re-prompt carrying the validation error, up to `maxAttempts` | Task 2 |
| exhaustion throws `502` with `failed validation after N attempts` | Task 2 |
| one structured log line per call (`operation, model, attempts, latencyMs, outcome, promptChars, outputChars`) | Task 1 (`log`), Task 7 step 5 (observed) |
| `FalRecipeParser` retrofit: keep interface/dir/prompt, move `pcs` default + trims into schema | Task 3 schema, Task 4 |
| `FalRecipeExtractor` retrofit: tolerant schema | Task 3 schema, Task 5 |
| `FalIngredientStructurer` not created here | not in plan (correct) |
| config: no new keys, `recipeImportLlmApiKey || falKey`, `recipeImportLlmModel` | Task 6 step 2 |
| DI: new `FalLlmClient` token, inject into two factories | Task 6 |
| error contract unchanged (`500` / `502` with `status`) | Task 1, Task 4, Task 7 step 2 |
| v2 seams documented, not built (routing via `model?`, cost, eval harness) | `model?` option exists (Task 1); nothing built — correct |
| Testing: bun:test, stubbed `fetch`, per-directory files | all tasks |
| Files list (new `FalLlmClient/`, modified two `Fal*` dirs + `dependencies/*` + `package.json`) | matches; plan additionally adds `schema.ts` + `schema.test.ts` per dir, an intentional refinement of the spec's "module-const schema" |

Gap check: the spec says the schema is a "module-const" inside `index.ts`; the plan puts it in a sibling `schema.ts` so it can be unit-tested directly. This is a deliberate, minor deviation that serves testability — noted here rather than treated as a miss.

**2. Placeholder scan**

No `TBD` / `TODO` / "add error handling" / "similar to Task N" / bare prose steps. Every code step has a full code block. The two "if tsc complains" notes (Task 3 step 4, Task 4 step 5) give a concrete fallback (`.transform((r): ParsedRecipe => r)` as the final schema step), not a vague deferral.

**3. Type consistency**

- `FalLlmClient` constructor `(apiKey: string, logger?: Logger, defaults?: { model?: string })` — used identically in Task 1 tests, Task 4/5 (not constructed there), Task 6 DI.
- `completeStructured(opts)` / `CompleteStructuredOptions<T>` / `LlmResult<T>` — `LlmResult.meta` fields (`operation, model, attempts, latencyMs`) identical in Task 1 impl, Task 4/5 fake `result()` helper.
- `parsedRecipeSchema` / `extractedRecipeSchema` — named identically in Task 3, imported under those names in Task 4/5.
- `FalRecipeParserOptions` / `FalRecipeExtractorOptions` keep `{ model?, timeoutMs? }` — same before and after.
- `DependencyToken.FalLlmClient` — same string in enum, type map, registration, and both resolving factories.
- Operation labels `'recipe.parse'` (Task 4) and `'recipe.extract'` (Task 5) — consistent between impl and test assertions.
