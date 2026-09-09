import { z } from 'zod';

import type { ParsedRecipe } from '../../domain/RecipeImportService/types';

const ingredientSchema = z
    .object({
        name: z.string(),
        quantity: z.number().finite().optional().catch(undefined),
        unit: z.string().optional().catch(undefined),
    })
    .transform((raw, ctx) => {
        const name = raw.name.trim();
        if (!name) {
            ctx.addIssue({ code: 'custom', message: 'ingredient has no name' });
            return z.NEVER;
        }
        if (raw.quantity === undefined) {
            return { name };
        }
        const unit = raw.unit && raw.unit.trim() ? raw.unit.trim() : 'pcs';
        return { name, quantity: raw.quantity, unit };
    });

const toStringArray = (value: Array<unknown> | undefined): string[] =>
    (value ?? []).filter((entry): entry is string => typeof entry === 'string');

export const parsedRecipeSchema: z.ZodType<ParsedRecipe> = z.object({
    title: z.unknown().transform((value) => (typeof value === 'string' ? value.trim() : '')),
    ingredients: z.array(ingredientSchema).min(1),
    instructions: z.array(z.unknown()).optional().catch(undefined).transform(toStringArray),
});
