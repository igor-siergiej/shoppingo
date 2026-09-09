import { z } from 'zod';

import { toStringArray } from '../zodHelpers';

export const extractedRecipeSchema: z.ZodType<{ title: string; ingredients: string[]; instructions: string[] }> = z
    .object({
        title: z.preprocess((value) => (typeof value === 'string' ? value : ''), z.string()),
        ingredients: z.preprocess(
            (value) => (Array.isArray(value) ? value : []),
            z.array(z.unknown()).transform(toStringArray)
        ),
        instructions: z.preprocess(
            (value) => (Array.isArray(value) ? value : []),
            z.array(z.unknown()).transform(toStringArray)
        ),
    })
    .transform((recipe): { title: string; ingredients: string[]; instructions: string[] } => ({
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
    }));
