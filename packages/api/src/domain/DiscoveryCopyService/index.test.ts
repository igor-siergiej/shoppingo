import { describe, expect, it } from 'bun:test';
import type { DiscoveryRecipe, Recipe, User } from '@shoppingo/types';

import { RecipeService } from '../RecipeService';
import { DiscoveryCopyService } from './index';

const me: User = { id: 'u-me', username: 'me' };
const friend: User = { id: 'u-friend', username: 'friend' };

const library: DiscoveryRecipe = {
    id: 'wikibooks-1',
    title: 'Fairy Cakes',
    ingredients: [{ id: 'lib-ing-1', name: 'butter', quantity: 100, unit: 'g' }],
    instructions: ['Cream the butter.', 'Bake.'],
    tags: ['cake'],
    prepTime: 15,
    cookTime: 20,
    servings: 12,
    difficulty: 'easy',
    coverImageKey: 'library-owned-cover',
    source: 'wikibooks',
    sourceUrl: 'https://en.wikibooks.org/wiki/Cookbook:Fairy_Cakes',
    licence: 'CC-BY-SA-4.0',
    attribution: '"Fairy Cakes" from Wikibooks Cookbook, CC BY-SA 4.0',
    createdAt: new Date(0),
    updatedAt: new Date(0),
};

const setup = (existing: Recipe[] = []) => {
    const store = new Map(existing.map((recipe) => [recipe.id, recipe]));
    const repo = {
        insert: async (recipe: Recipe) => {
            store.set(recipe.id, recipe);
            return recipe;
        },
        getById: async (id: string) => store.get(id) ?? null,
        findByUserId: async (userId: string) =>
            [...store.values()].filter((recipe) => recipe.users.some((user) => user.id === userId)),
    };
    let n = 0;
    // The real RecipeService, with a friend list that would auto-share a recipe if the copy did not opt out.
    const recipes = new RecipeService(
        repo as never,
        { generate: () => `gen-${++n}` },
        undefined,
        undefined,
        undefined,
        undefined,
        { listFriends: async () => [friend] } as never
    );
    const discovery = {
        getRecipe: async (id: string) => {
            if (id !== library.id) throw Object.assign(new Error('Library recipe not found'), { status: 404 });
            return library;
        },
    };
    return { copy: new DiscoveryCopyService(discovery, recipes), store };
};

describe('DiscoveryCopyService', () => {
    it('creates a personal recipe from the library recipe, keeping the source link and attribution', async () => {
        const { copy, store } = setup();

        const created = await copy.copyToPersonal('wikibooks-1', me);

        expect(store.get(created.id)).toMatchObject({
            title: 'Fairy Cakes',
            ownerId: 'u-me',
            link: library.sourceUrl,
            attribution: library.attribution,
            instructions: library.instructions,
            tags: ['cake'],
            prepTime: 15,
            cookTime: 20,
            servings: 12,
            difficulty: 'easy',
        });
        expect(created.ingredients).toEqual([{ id: expect.any(String), name: 'butter', quantity: 100, unit: 'g' }]);
    });

    it('is not shared with anyone, even though the user has friends', async () => {
        const { copy } = setup();
        const created = await copy.copyToPersonal('wikibooks-1', me);
        expect(created.users).toEqual([me]);
    });

    it('never points the personal recipe at a library-owned cover image', async () => {
        const { copy } = setup();
        const created = await copy.copyToPersonal('wikibooks-1', me);
        expect(created.coverImageKey).toBeUndefined();
        expect(created.aiImageKey).toBeUndefined();
    });

    it('does not reuse the library ingredient ids', async () => {
        const { copy } = setup();
        const created = await copy.copyToPersonal('wikibooks-1', me);
        expect(created.ingredients[0]?.id).not.toBe('lib-ing-1');
    });

    it('answers 409 instead of creating a second copy of the same library recipe', async () => {
        const { copy, store } = setup();
        await copy.copyToPersonal('wikibooks-1', me);

        await expect(copy.copyToPersonal('wikibooks-1', me)).rejects.toMatchObject({ status: 409 });
        expect(store.size).toBe(1);
    });

    it('lets a different user make their own copy of a recipe someone else already added', async () => {
        const { copy, store } = setup();
        await copy.copyToPersonal('wikibooks-1', me);

        await copy.copyToPersonal('wikibooks-1', friend);

        expect(store.size).toBe(2);
    });

    it('passes a missing library recipe through as 404 and creates nothing', async () => {
        const { copy, store } = setup();
        await expect(copy.copyToPersonal('nope', me)).rejects.toMatchObject({ status: 404 });
        expect(store.size).toBe(0);
    });
});
