import { Item } from 'types';
import { ItemCheckBoxListProps } from './types';
import ItemCheckBox from '../ItemCheckBox';

const ItemCheckBoxList = ({
    items,
    refetch,
    listName,
}: ItemCheckBoxListProps) => {
    const renderedOutput = items.sort((a, b) => a.isSelected === b.isSelected ? 0 : a.isSelected ? 1 : -1).map((item: Item, index) => (
        <ItemCheckBox
            item={item}
            listName={listName}
            refetch={refetch}
            key={index}
        />
    ));
    return renderedOutput;
};

export default ItemCheckBoxList;
