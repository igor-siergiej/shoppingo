import type { ItemCategory } from '@shoppingo/types';

export interface ItemCategoryRepository {
    ensureIndexes(): Promise<void>;
    get(name: string): Promise<ItemCategory | null>;
    set(name: string, category: ItemCategory): Promise<void>;
}
