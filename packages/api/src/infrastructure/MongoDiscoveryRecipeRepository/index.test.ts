import { describe, expect, it, vi } from 'bun:test';
import type { DiscoveryRecipe } from '@shoppingo/types';

import { MongoDiscoveryRecipeRepository } from './index';

const NO_OBJECT_ID = { projection: { _id: 0 } } as const;

const recipe = (id: string): DiscoveryRecipe => ({
    id,
    title: id,
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

const setup = (docs: DiscoveryRecipe[] = []) => {
    const collection = {
        createIndex: vi.fn(),
        findOne: vi.fn(async () => docs[0] ?? null),
        replaceOne: vi.fn(),
        deleteOne: vi.fn(),
        countDocuments: vi.fn(async () => 1),
        find: vi.fn(() => ({
            toArray: async () => docs,
            sort: () =>
                (async function* () {
                    yield* docs;
                })(),
        })),
    };
    const db = { getCollection: vi.fn(() => collection) };
    return { repo: new MongoDiscoveryRecipeRepository(db as never), collection, db };
};

describe('MongoDiscoveryRecipeRepository', () => {
    it('uses the dedicated discoveryRecipes collection, not the personal recipe collection', async () => {
        const { repo, db } = setup();
        await repo.getById('a');
        expect(db.getCollection).toHaveBeenCalledWith('discoveryRecipes');
    });

    it('guarantees one document per library id', async () => {
        const { repo, collection } = setup();
        await repo.ensureIndexes();
        expect(collection.createIndex).toHaveBeenCalledWith({ id: 1 }, { unique: true });
    });

    it('never returns Mongo _id', async () => {
        const { repo, collection } = setup([recipe('a')]);
        await repo.getById('a');
        expect(collection.findOne).toHaveBeenCalledWith({ id: 'a' }, { projection: { _id: 0 } });
    });

    it('fetches several recipes in one $in query, and skips the query for no ids', async () => {
        const { repo, collection } = setup([recipe('a'), recipe('b')]);

        expect((await repo.getByIds(['a', 'b'])).map((r) => r.id)).toEqual(['a', 'b']);
        expect(collection.find).toHaveBeenCalledWith({ id: { $in: ['a', 'b'] } }, { projection: { _id: 0 } });

        collection.find.mockClear();
        expect(await repo.getByIds([])).toEqual([]);
        expect(collection.find).not.toHaveBeenCalled();
    });

    it('upserts by library id', async () => {
        const { repo, collection } = setup();
        await repo.upsert(recipe('a'));
        expect(collection.replaceOne).toHaveBeenCalledWith({ id: 'a' }, recipe('a'), { upsert: true });
    });

    it('streams the whole library in bounded batches, including the short final one', async () => {
        const { repo } = setup([recipe('a'), recipe('b'), recipe('c'), recipe('d'), recipe('e')]);
        const sizes: number[] = [];
        for await (const batch of repo.batches(2)) sizes.push(batch.length);
        expect(sizes).toEqual([2, 2, 1]);
    });

    it('yields nothing for an empty library', async () => {
        const { repo } = setup([]);
        const sizes: number[] = [];
        for await (const batch of repo.batches(2)) sizes.push(batch.length);
        expect(sizes).toEqual([]);
    });

    it('lists revisions for one source only, without loading whole recipes', async () => {
        const { repo, collection } = setup([{ ...recipe('wikibooks-1'), sourceRevision: 7 }]);
        const revisions = await repo.listRevisions('wikibooks');
        expect(collection.find).toHaveBeenCalledWith(
            { source: 'wikibooks' },
            { projection: { _id: 0, id: 1, sourceRevision: 1, imageRevision: 1, createdAt: 1 } }
        );
        expect(revisions).toHaveLength(1);
    });

    it('finds same-titled recipes case-insensitively, so a duplicate check is not fooled by capitals', async () => {
        const { repo, collection } = setup([recipe('a')]);
        await repo.findByTitle('Grandma Soup');
        expect(collection.find).toHaveBeenCalledWith(
            { title: 'Grandma Soup' },
            { projection: { _id: 0 }, collation: { locale: 'en', strength: 2 } }
        );
    });

    it('asks whether a cover key is still in use with a single-document count', async () => {
        const { repo, collection } = setup();
        expect(await repo.hasCoverImageKey('discovery-image/user-1/1.png')).toBe(true);
        expect(collection.countDocuments).toHaveBeenCalledWith(
            { coverImageKey: 'discovery-image/user-1/1.png' },
            { limit: 1 }
        );
        collection.countDocuments.mockResolvedValueOnce(0);
        expect(await repo.hasCoverImageKey('gone')).toBe(false);
    });

    it('adds a unique sparse slug index so user-published slugs cannot collide', async () => {
        const { repo, collection } = setup();
        await repo.ensureIndexes();
        expect(collection.createIndex).toHaveBeenCalledWith({ slug: 1 }, { unique: true, sparse: true });
    });

    it('looks up by slug case-sensitively and never returns _id', async () => {
        const { repo, collection } = setup();
        collection.findOne.mockResolvedValueOnce(recipe('abc'));
        const result = await repo.getBySlug('pancakes');
        expect(collection.findOne).toHaveBeenCalledWith({ slug: 'pancakes' }, NO_OBJECT_ID);
        expect(result?.id).toBe('abc');
    });

    it('listPublic returns only recipes that have a slug and sorts them newest-first', async () => {
        const { repo, collection } = setup();
        let capturedSort: unknown;
        collection.find = vi.fn().mockReturnValue({
            sort: (s: unknown) => {
                capturedSort = s;
                return { limit: () => ({ toArray: async () => [] }) };
            },
        });
        await repo.listPublic(20, null);
        expect(collection.find).toHaveBeenCalledWith({ slug: { $exists: true } }, { projection: {} });
        expect(capturedSort).toEqual({ createdAt: -1, _id: -1 });
    });

    it('listPublic seeks past the cursor with _id < after', async () => {
        const { repo, collection } = setup();
        const findCalls: unknown[][] = [];
        collection.find = vi.fn((filter: unknown) => {
            findCalls.push([filter]);
            return {
                sort: () => ({ limit: () => ({ toArray: async () => [] }) }),
            };
        });
        await repo.listPublic(20, '507f1f77bcf86cd799439011');
        const capturedFilter = findCalls[0]?.[0];
        expect(capturedFilter).toMatchObject({ slug: { $exists: true } });
        expect(JSON.stringify(capturedFilter)).toContain('507f1f77bcf86cd799439011');
    });

    it('hasSlug returns false when no recipe owns the slug', async () => {
        const { repo, collection } = setup();
        collection.countDocuments.mockResolvedValueOnce(0);
        expect(await repo.hasSlug('pancakes')).toBe(false);
    });
});
