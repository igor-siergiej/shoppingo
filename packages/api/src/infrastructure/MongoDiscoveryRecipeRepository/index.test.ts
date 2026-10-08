import { describe, expect, it, vi } from 'bun:test';
import type { DiscoveryRecipe } from '@shoppingo/types';

import { MongoDiscoveryRecipeRepository } from './index';

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
});
