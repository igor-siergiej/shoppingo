import type { Ingredient, RecipeResponse } from '@shoppingo/types';
import { MOCK_USER } from './users';

export const makeIngredient = (overrides?: Partial<Ingredient>): Ingredient => ({
    id: `ing-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Test Ingredient',
    ...overrides,
});

export const makeRecipe = (overrides?: Partial<RecipeResponse>): RecipeResponse => ({
    id: `recipe-${Math.random().toString(36).slice(2, 9)}`,
    title: 'Test Recipe',
    ingredients: [],
    users: [{ username: MOCK_USER.username }],
    ownerId: MOCK_USER.id,
    dateAdded: new Date('2024-01-01').toISOString() as unknown as Date,
    ...overrides,
});
