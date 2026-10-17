import { describe, expect, it } from 'bun:test';

import { aiFeaturesFromEnv } from './index';

describe('aiFeaturesFromEnv', () => {
    it('reports every feature as off when FAL_KEY and the LLM key are both empty', () => {
        expect(aiFeaturesFromEnv({} as NodeJS.ProcessEnv)).toEqual({
            imageGeneration: false,
            recipeImport: false,
            ingredientSubstitutes: false,
            itemCategorisation: false,
            itemParse: false,
            recipeTagger: false,
        });
    });

    it('flips image generation on when FAL_KEY is set', () => {
        const features = aiFeaturesFromEnv({ FAL_KEY: 'demo-key' } as NodeJS.ProcessEnv);
        expect(features.imageGeneration).toBe(true);
        expect(features.recipeImport).toBe(true);
        expect(features.ingredientSubstitutes).toBe(true);
    });

    it('flips the LLM features on when only RECIPE_IMPORT_LLM_API_KEY is set', () => {
        const features = aiFeaturesFromEnv({ RECIPE_IMPORT_LLM_API_KEY: 'demo-llm-key' } as NodeJS.ProcessEnv);
        expect(features.imageGeneration).toBe(false);
        expect(features.recipeImport).toBe(true);
        expect(features.ingredientSubstitutes).toBe(true);
        expect(features.recipeTagger).toBe(true);
    });
});
