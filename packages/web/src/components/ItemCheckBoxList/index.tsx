import { Item } from '@shoppingo/types';

import ItemCheckBox from '../ItemCheckBox';
import { ItemCheckBoxListProps } from './types';

const ItemCheckBoxList = ({
    items,
    refetch,
    listTitle,
}: ItemCheckBoxListProps) => {
    const renderedOutput = items.sort((a, b) => a.isSelected === b.isSelected ? 0 : a.isSelected ? -1 : 1).map((item: Item, index) => (
        <ItemCheckBox
            item={item}
            listTitle={listTitle}
            refetch={refetch}
            key={index}
        />
    ));

    return renderedOutput;
};

export default ItemCheckBoxList;
