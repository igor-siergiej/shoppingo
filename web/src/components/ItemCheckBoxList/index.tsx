import { FormControlLabel, Checkbox } from '@mui/material';
import { type Item } from '../../types';

interface ItemCheckBoxListProps {
    items: Item[];
    handleOnChange: (arg0: Item) => void;
}

const ItemCheckBoxList = ({ items, handleOnChange }: ItemCheckBoxListProps) => {
    const renderedOutput = items.map((item: Item) => (
        <FormControlLabel
            key={item.name}
            control={
                <Checkbox
                    checked={item.selected}
                    onChange={() => {
                        handleOnChange(item);
                    }}
                />
            }
            label={item.name}
        />
    ));
    return <>{renderedOutput}</>;
};

export default ItemCheckBoxList;
