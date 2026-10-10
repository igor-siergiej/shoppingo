import { ITEM_CATEGORIES, type ItemCategory } from '@shoppingo/types';
import { z } from 'zod';

export const categorySchema: z.ZodType<{ category: ItemCategory }> = z.object({ category: z.enum(ITEM_CATEGORIES) });
