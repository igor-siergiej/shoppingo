import { Item } from 'types';
import { ItemCheckBoxListProps } from './types';
import ItemCheckBox from '../ItemCheckBox';

const ItemCheckBoxList = ({
    items,
    refetch,
    listName,
}: ItemCheckBoxListProps) => {
    const renderedOutput = items.map((item: Item, index) => (
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
