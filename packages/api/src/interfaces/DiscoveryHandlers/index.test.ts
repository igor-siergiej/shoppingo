import { describe, expect, it, vi } from 'bun:test';
import { errorHandler } from '@imapps/api-utils/hono';
import type { DiscoveryRecipe } from '@shoppingo/types';
import { Hono } from 'hono';

import type { DiscoveryCopyService } from '../../domain/DiscoveryCopyService';
import { DiscoveryService } from '../../domain/DiscoveryService';
import type { DiscoveryIndex } from '../../domain/DiscoveryService/types';
import { MongoDiscoveryRecipeRepository } from '../../infrastructure/MongoDiscoveryRecipeRepository';
import type { HonoVars } from '../handlerUtils';
import { createDiscoveryHandlers } from './index';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

const appFor = (service: DiscoveryService, copyService: DiscoveryCopyService = {} as never) => {
    const handlers = createDiscoveryHandlers(service, copyService, logger as never);
    const app = new Hono<HonoVars>();
    app.onError(errorHandler);
    app.get('/api/discover/recipes', handlers.searchRecipes as never);
    app.get('/api/discover/recipes/:id/similar', handlers.getSimilarRecipes as never);
    app.get('/api/discover/recipes/:id', handlers.getRecipe as never);
    // Auth middleware stand-in: `X-Test-User` names the authenticated user, absent means unauthenticated.
    app.post(
        '/api/discover/recipes/:id/copy',
        async (c, next) => {
            const id = c.req.header('x-test-user');
            if (id) c.set('user', { id, username: id });
            await next();
        },
        handlers.copyRecipe as never
    );
    return app;
};

const emptyResult = {
    hits: [],
    total: 0,
    page: 1,
    pageSize: 20,
    facets: { tags: [], difficulty: [], source: [], ingredients: [], time: [] },
};

const libraryRecipe = (id: string): DiscoveryRecipe => ({
    id,
    title: `Library ${id}`,
    ingredients: [],
    instructions: [],
    tags: [],
    source: 'wikibooks',
    sourceUrl: 'https://example.test',
    licence: 'CC-BY-SA-4.0',
    attribution: 'Wikibooks contributors',
    createdAt: new Date(0),
    updatedAt: new Date(0),
});

const fakeIndex = (overrides: Partial<DiscoveryIndex> = {}): DiscoveryIndex => ({
    ensureIndex: vi.fn(),
    index: vi.fn(),
    remove: vi.fn(),
    search: vi.fn(async () => emptyResult),
    similar: vi.fn(async () => []),
    rebuild: vi.fn(),
    ...overrides,
});

/** A Mongo double holding BOTH the private recipe collection and the library, recording which were touched. */
const fakeDb = (collections: Record<string, Array<Record<string, unknown>>>) => {
    const touched: string[] = [];
    return {
        touched,
        getCollection: (name: string) => {
            touched.push(name);
            return {
                findOne: async (filter: { id: string }) => collections[name]?.find((d) => d.id === filter.id) ?? null,
            };
        },
    };
};

describe('GET /api/discover/recipes', () => {
    it('parses repeated and comma-separated lists, numbers and enums into the search query', async () => {
        const index = fakeIndex();
        const app = appFor(new DiscoveryService({} as never, index));

        const res = await app.request(
            '/api/discover/recipes?q=soup&tags=vegan,quick&tags=easy&ingredients=olive%20oil&difficulty=easy,hard&source=user&minTime=10&maxTime=60&page=2&pageSize=5'
        );

        expect(res.status).toBe(200);
        expect(index.search).toHaveBeenCalledWith({
            q: 'soup',
            tags: ['vegan', 'quick', 'easy'],
            ingredients: ['olive oil'],
            difficulty: ['easy', 'hard'],
            source: ['user'],
            minTime: 10,
            maxTime: 60,
            page: 2,
            pageSize: 5,
        });
    });

    it('keeps a comma inside an ingredient name instead of splitting it into two filters', async () => {
        const index = fakeIndex();
        const app = appFor(new DiscoveryService({} as never, index));

        await app.request('/api/discover/recipes?ingredients=onion%2C%20chopped&ingredients=salt');

        expect(index.search).toHaveBeenCalledWith(expect.objectContaining({ ingredients: ['onion, chopped', 'salt'] }));
    });

    it.each([
        ['difficulty=impossible'],
        ['source=martian'],
        ['page=0'],
        ['page=abc'],
        ['pageSize=1.5'],
        ['minTime=-1'],
    ])('rejects a malformed query (%s) with 400 without calling the index', async (qs) => {
        const index = fakeIndex();
        const res = await appFor(new DiscoveryService({} as never, index)).request(`/api/discover/recipes?${qs}`);
        expect(res.status).toBe(400);
        expect(index.search).not.toHaveBeenCalled();
    });

    it('returns 503 with a clear message when the search engine is unreachable', async () => {
        const index = fakeIndex({
            search: vi
                .fn()
                .mockRejectedValue(
                    Object.assign(new Error('Recipe discovery is temporarily unavailable'), { status: 503 })
                ),
        });
        const res = await appFor(new DiscoveryService({} as never, index)).request('/api/discover/recipes?q=soup');
        expect(res.status).toBe(503);
        expect(await res.json()).toEqual({ error: 'Recipe discovery is temporarily unavailable' });
    });

    it('hides the message of an unexpected failure behind a generic 500', async () => {
        const index = fakeIndex({ search: vi.fn().mockRejectedValue(new Error('cluster password is hunter2')) });
        const res = await appFor(new DiscoveryService({} as never, index)).request('/api/discover/recipes');
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: 'Internal Server Error' });
    });
});

describe('library recipe endpoints', () => {
    it('returns a library recipe without Mongo bookkeeping', async () => {
        const db = fakeDb({ discoveryRecipes: [libraryRecipe('lib-1')] });
        const service = new DiscoveryService(new MongoDiscoveryRecipeRepository(db as never), fakeIndex());
        const res = await appFor(service).request('/api/discover/recipes/lib-1');
        expect(res.status).toBe(200);
        expect(((await res.json()) as DiscoveryRecipe).title).toBe('Library lib-1');
    });

    it('404s similar-recipes for an unknown recipe and passes the limit through for a known one', async () => {
        const index = fakeIndex();
        const db = fakeDb({ discoveryRecipes: [libraryRecipe('lib-1')] });
        const app = appFor(new DiscoveryService(new MongoDiscoveryRecipeRepository(db as never), index));

        expect((await app.request('/api/discover/recipes/none/similar')).status).toBe(404);
        expect((await app.request('/api/discover/recipes/lib-1/similar?limit=3')).status).toBe(200);
        expect(index.similar).toHaveBeenCalledWith('lib-1', 3);
    });

    it('never exposes a private personal recipe, even when asked for its exact id', async () => {
        const db = fakeDb({
            recipe: [
                { id: 'private-1', title: 'Grandma secret', users: [{ id: 'u1', username: 'alice' }], ownerId: 'u1' },
            ],
            discoveryRecipes: [libraryRecipe('lib-1')],
        });
        const index = fakeIndex();
        const app = appFor(new DiscoveryService(new MongoDiscoveryRecipeRepository(db as never), index));

        const direct = await app.request('/api/discover/recipes/private-1');
        const similar = await app.request('/api/discover/recipes/private-1/similar');

        expect(direct.status).toBe(404);
        expect(similar.status).toBe(404);
        expect(await direct.text()).not.toContain('Grandma');
        expect(index.similar).not.toHaveBeenCalled();
        // The discovery path read the library collection and nothing else.
        expect(new Set(db.touched)).toEqual(new Set(['discoveryRecipes']));
    });
});

describe('POST /api/discover/recipes/:id/copy', () => {
    const copyService = (impl: (id: string, user: unknown) => Promise<unknown>) =>
        ({ copyToPersonal: vi.fn(impl) }) as unknown as DiscoveryCopyService;

    it('creates the copy for the authenticated user and answers 201 with the new recipe', async () => {
        const copy = copyService(async (id, user) => ({ id: 'personal-1', title: `from ${id}`, owner: user }));
        const app = appFor(new DiscoveryService({} as never, fakeIndex()), copy);

        const res = await app.request('/api/discover/recipes/lib-1/copy', {
            method: 'POST',
            headers: { 'x-test-user': 'u-me' },
        });

        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({ id: 'personal-1', owner: { id: 'u-me' } });
        expect(copy.copyToPersonal).toHaveBeenCalledWith('lib-1', { id: 'u-me', username: 'u-me' });
    });

    it('rejects an unauthenticated caller without copying anything', async () => {
        const copy = copyService(async () => ({}));
        const app = appFor(new DiscoveryService({} as never, fakeIndex()), copy);

        const res = await app.request('/api/discover/recipes/lib-1/copy', { method: 'POST' });

        expect(res.status).toBe(401);
        expect(copy.copyToPersonal).not.toHaveBeenCalled();
    });

    it('surfaces a duplicate as 409 with its message', async () => {
        const copy = copyService(async () => {
            throw Object.assign(new Error('This recipe is already in your recipes'), { status: 409 });
        });
        const res = await appFor(new DiscoveryService({} as never, fakeIndex()), copy).request(
            '/api/discover/recipes/lib-1/copy',
            { method: 'POST', headers: { 'x-test-user': 'u-me' } }
        );
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({ error: 'This recipe is already in your recipes' });
    });
});
