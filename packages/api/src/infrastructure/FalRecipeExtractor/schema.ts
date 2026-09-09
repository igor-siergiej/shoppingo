import { z } from 'zod';

const toStringArray = (value: Array<unknown> | undefined): string[] =>
    (value ?? []).filter((entry): entry is string => typeof entry === 'string');

export const extractedRecipeSchema = z.object({
    title: z.unknown().transform((value) => (typeof value === 'string' ? value : '')),
    ingredients: z.array(z.unknown()).optional().catch(undefined).transform(toStringArray),
    instructions: z.array(z.unknown()).optional().catch(undefined).transform(toStringArray),
});
