import { ITEM_CATEGORIES, type Item, type ItemCategory } from '@shoppingo/types';

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
    produce: 'Produce',
    dairy: 'Dairy',
    bakery: 'Bakery',
    'meat-fish': 'Meat & fish',
    frozen: 'Frozen',
    pantry: 'Pantry',
    drinks: 'Drinks',
    household: 'Household',
    other: 'Other',
};

/** An item the classifier hasn't reached yet (or that was added offline) counts as "other". */
const categoryOf = (item: Pick<Item, 'category'>): ItemCategory => item.category ?? 'other';

export interface CategoryGroup {
    category: ItemCategory;
    items: Array<Item>;
}

/** Groups in aisle order, skipping empty aisles; items keep their incoming order inside each group. */
export const groupByCategory = (items: Array<Item>): Array<CategoryGroup> =>
    ITEM_CATEGORIES.map((category) => ({
        category,
        items: items.filter((item) => categoryOf(item) === category),
    })).filter((group) => group.items.length > 0);
