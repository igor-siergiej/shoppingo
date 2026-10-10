import type { Item } from '@shoppingo/types';

import { CATEGORY_LABELS, groupByCategory } from '../../utils/itemCategories';
import ItemCheckBox from '../ItemCheckBox';
import type { ItemCheckBoxListProps } from './types';

const selectedLast = (a: Item, b: Item) => (a.isSelected === b.isSelected ? 0 : a.isSelected ? -1 : 1);

const ItemCheckBoxList = ({ items, listTitle, listType, groupByAisle = false }: ItemCheckBoxListProps) => {
    const renderItem = (item: Item) => (
        <ItemCheckBox item={item} listTitle={listTitle} listType={listType} key={item.id || item.name} />
    );

    if (!groupByAisle) {
        return items.slice().sort(selectedLast).map(renderItem);
    }

    return groupByCategory(items).map(({ category, items: groupItems }) => (
        <section key={category} aria-label={CATEGORY_LABELS[category]}>
            <h2 className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[category]}
            </h2>
            {groupItems.slice().sort(selectedLast).map(renderItem)}
        </section>
    ));
};

export default ItemCheckBoxList;
