import { describe, expect, it } from 'bun:test';

import { recipeEstimateSchema } from './schema';

describe('recipeEstimateSchema', () => {
    it('keeps valid fields', () => {
        expect(recipeEstimateSchema.parse({ prepTime: 15, cookTime: 45, servings: 4, difficulty: 'easy' })).toEqual({
            prepTime: 15,
            cookTime: 45,
            servings: 4,
            difficulty: 'easy',
        });
    });

    it('drops only the fields the model got wrong', () => {
        expect(
            recipeEstimateSchema.parse({ prepTime: 0, cookTime: 'soon', servings: 2.5, difficulty: 'impossible' })
        ).toEqual({});
        expect(recipeEstimateSchema.parse({ prepTime: 10, servings: 'a few' })).toEqual({ prepTime: 10 });
    });

    it('rejects absurd durations and portion counts', () => {
        expect(recipeEstimateSchema.parse({ cookTime: 999999, servings: 5000 })).toEqual({});
    });
});
