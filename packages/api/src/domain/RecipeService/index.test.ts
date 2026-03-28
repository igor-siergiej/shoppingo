import { beforeEach, describe, expect, it } from 'bun:test';
import type { Ingredient, Recipe, User } from '@shoppingo/types';
import { RecipeService } from './index';

class MockRepository {
    private store = new Map<string, Recipe>();

    async insert(recipe: Recipe): Promise<Recipe> {
        this.store.set(recipe.id, recipe);
        return recipe;
    }

    async getById(id: string): Promise<Recipe | null> {
        return this.store.get(id) ?? null;
    }

    async update(id: string, recipe: Recipe): Promise<Recipe> {
        this.store.set(id, recipe);
        return recipe;
    }

    async deleteById(id: string): Promise<void> {
        this.store.delete(id);
    }

    async findByUserId(_userId: string): Promise<Recipe[]> {
        return [];
    }

    async addUser(id: string, user: User): Promise<Recipe> {
        const r = this.store.get(id);
        if (!r) throw new Error(`Recipe ${id} not found`);
        r.users.push(user);
        this.store.set(id, r);
        return r;
    }

    async removeUser(id: string, userId: string): Promise<Recipe> {
        const r = this.store.get(id);
        if (!r) throw new Error(`Recipe ${id} not found`);
        r.users = r.users.filter((u) => u.id !== userId);
        this.store.set(id, r);
        return r;
    }

    async setCoverImageKey(id: string, key: string): Promise<void> {
        const r = this.store.get(id);
        if (r) {
            r.coverImageKey = key;
            this.store.set(id, r);
        }
    }

    reset() {
        this.store.clear();
    }
}

class MockIdGenerator {
    private n = 0;
    generate() {
        return `id-${++this.n}`;
    }
    reset() {
        this.n = 0;
    }
}

const repo = new MockRepository();
const ids = new MockIdGenerator();
const owner: User = { id: 'user-1', username: 'alice' };

beforeEach(() => {
    repo.reset();
    ids.reset();
});

describe('RecipeService.createRecipe', () => {
    it('persists link and instructions when provided', async () => {
        const svc = new RecipeService(repo as any, ids);
        const recipe = await svc.createRecipe('Carbonara', [], owner.id, owner, 'https://example.com/carbonara', [
            'Boil water',
            'Cook pasta',
        ]);
        expect(recipe.link).toBe('https://example.com/carbonara');
        expect(recipe.instructions).toEqual(['Boil water', 'Cook pasta']);
    });

    it('creates recipe without link or instructions when omitted', async () => {
        const svc = new RecipeService(repo as any, ids);
        const recipe = await svc.createRecipe('Pasta', [], owner.id, owner);
        expect(recipe.link).toBeUndefined();
        expect(recipe.instructions).toBeUndefined();
    });
});

class MockRecipeImageService {
    calls: Array<{ recipeId: string; title: string; ingredients: Ingredient[] }> = [];
    shouldReject = false;

    async generateRecipeImage(recipeId: string, title: string, ingredients: Ingredient[]): Promise<string> {
        this.calls.push({ recipeId, title, ingredients });
        if (this.shouldReject) throw new Error('generation failed');
        return `recipe-images/${recipeId}`;
    }

    reset() {
        this.calls = [];
        this.shouldReject = false;
    }
}

const mockImageService = new MockRecipeImageService();

beforeEach(() => {
    mockImageService.reset();
});

describe('RecipeService.createRecipe image enrichment', () => {
    it('fires background image enrichment when recipeImageService provided', async () => {
        const svc = new RecipeService(repo as any, ids, undefined, undefined, mockImageService as any);
        const recipe = await svc.createRecipe('Pasta', [{ id: '1', name: 'flour' }], owner.id, owner);

        await new Promise((r) => setTimeout(r, 10));

        expect(mockImageService.calls.length).toBe(1);
        expect(mockImageService.calls[0].recipeId).toBe(recipe.id);
        expect(mockImageService.calls[0].title).toBe('Pasta');
        expect(repo.store.get(recipe.id)?.coverImageKey).toBe(`recipe-images/${recipe.id}`);
    });

    it('skips enrichment when no recipeImageService provided', async () => {
        const svc = new RecipeService(repo as any, ids);
        await svc.createRecipe('Pasta', [], owner.id, owner);

        await new Promise((r) => setTimeout(r, 10));

        expect(mockImageService.calls.length).toBe(0);
    });

    it('does not throw when enrichment fails', async () => {
        mockImageService.shouldReject = true;
        const svc = new RecipeService(repo as any, ids, undefined, undefined, mockImageService as any);

        await expect(svc.createRecipe('Pasta', [], owner.id, owner)).resolves.toBeDefined();
    });
});

describe('RecipeService.updateRecipe', () => {
    it('persists link and instructions on update', async () => {
        const svc = new RecipeService(repo as any, ids);
        const created = await svc.createRecipe('Pasta', [], owner.id, owner);
        const updated = await svc.updateRecipe(created.id, 'Pasta v2', [], owner.id, 'https://example.com/pasta', [
            'Step 1',
            'Step 2',
        ]);
        expect(updated.link).toBe('https://example.com/pasta');
        expect(updated.instructions).toEqual(['Step 1', 'Step 2']);
    });

    it('clears link and instructions when passed as undefined', async () => {
        const svc = new RecipeService(repo as any, ids);
        const created = await svc.createRecipe('Pasta', [], owner.id, owner, 'https://example.com', ['Step 1']);
        const updated = await svc.updateRecipe(created.id, 'Pasta', [], owner.id, undefined, undefined);
        expect(updated.link).toBeUndefined();
        expect(updated.instructions).toBeUndefined();
    });
});
