import type { ItemCategory } from '@tandra/types';

export interface ItemCategoryRepository {
    ensureIndexes(): Promise<void>;
    get(name: string): Promise<ItemCategory | null>;
    set(name: string, category: ItemCategory): Promise<void>;
}
