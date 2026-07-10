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
    ingredients: [{ name: 'spaghetti', quantity: 350, unit: 'g' }, { name: 'freshly ground black pepper' }],
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
            okResponse(
                '{"title":"X","ingredients":[{"name":"onion","quantity":"one","unit":"pcs"}],"instructions":["Do."]}'
            )
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
