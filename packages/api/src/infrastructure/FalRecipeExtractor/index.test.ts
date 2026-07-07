import { afterEach, describe, expect, it } from 'bun:test';

import { FalRecipeExtractor } from './index';

const originalFetch = globalThis.fetch;

const stubFetch = (impl: typeof fetch) => {
    globalThis.fetch = impl as typeof fetch;
};

const okResponse = (output: string) =>
    new Response(JSON.stringify({ output }), { headers: { 'content-type': 'application/json' } });

describe('FalRecipeExtractor', () => {
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('throws 500 when no api key is configured', async () => {
        await expect(new FalRecipeExtractor('').extract('text')).rejects.toMatchObject({ status: 500 });
    });

    it('sends the model and Key auth header and parses clean JSON', async () => {
        let sentBody: Record<string, unknown> = {};
        let authHeader: string | null = null;
        stubFetch(async (_url, init) => {
            authHeader = new Headers(init?.headers).get('authorization');
            sentBody = JSON.parse(init?.body as string);
            return okResponse(
                JSON.stringify({ title: 'Soup', ingredients: ['1 onion', '2 carrots'], instructions: ['Boil.'] })
            );
        });

        const result = await new FalRecipeExtractor('secret', { model: 'google/gemini-2.5-flash-lite' }).extract(
            'page text'
        );

        expect(authHeader).toBe('Key secret');
        expect(sentBody.model).toBe('google/gemini-2.5-flash-lite');
        expect(result).toEqual({ title: 'Soup', ingredients: ['1 onion', '2 carrots'], instructions: ['Boil.'] });
    });

    it('extracts JSON wrapped in prose or code fences', async () => {
        stubFetch(async () =>
            okResponse('Here you go:\n```json\n{"title":"X","ingredients":["a"],"instructions":["b"]}\n```')
        );

        const result = await new FalRecipeExtractor('secret').extract('text');

        expect(result.title).toBe('X');
        expect(result.ingredients).toEqual(['a']);
    });

    it('coerces missing/wrong-typed fields to safe defaults', async () => {
        stubFetch(async () => okResponse('{"ingredients":"not-an-array"}'));

        const result = await new FalRecipeExtractor('secret').extract('text');

        expect(result).toEqual({ title: '', ingredients: [], instructions: [] });
    });

    it('throws 502 on a non-ok response', async () => {
        stubFetch(async () => new Response('boom', { status: 500 }));

        await expect(new FalRecipeExtractor('secret').extract('text')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when the model returns an error field', async () => {
        stubFetch(
            async () =>
                new Response(JSON.stringify({ error: 'rate limited' }), {
                    headers: { 'content-type': 'application/json' },
                })
        );

        await expect(new FalRecipeExtractor('secret').extract('text')).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 when the output contains no JSON object', async () => {
        stubFetch(async () => okResponse('sorry, I cannot help'));

        await expect(new FalRecipeExtractor('secret').extract('text')).rejects.toMatchObject({ status: 502 });
    });
});
