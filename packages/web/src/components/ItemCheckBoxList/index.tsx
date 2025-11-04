import type { Item } from '@shoppingo/types';

import ItemCheckBox from '../ItemCheckBox';
import type { ItemCheckBoxListProps } from './types';

const ItemCheckBoxList = ({ items, listTitle }: ItemCheckBoxListProps) => {
    const renderedOutput = items
        .slice()
        .sort((a, b) => (a.isSelected === b.isSelected ? 0 : a.isSelected ? -1 : 1))
        .map((item: Item) => (
            <ItemCheckBox item={item} listTitle={listTitle} key={item.id || item.name} />
        ));

    return renderedOutput;
};

export default ItemCheckBoxList;
