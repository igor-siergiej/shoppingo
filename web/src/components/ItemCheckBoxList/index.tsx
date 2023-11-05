import { FormControlLabel, Checkbox, Box } from '@mui/material';
import { type Item } from '../../types';

interface ItemCheckBoxListProps {
    items: Item[];
    handleOnChange: (arg0: Item) => void;
}

const ItemCheckBoxList = ({ items, handleOnChange }: ItemCheckBoxListProps) => {
    const renderedOutput = items.map((item: Item) => (
        <Box
            key={item.name}
            sx={{
                mb: '0.5em',
                pl: '0.5em',
                border: 3,
                borderColor: '#c8e4be',
                backgroundColor: '#d8f7cd',
                borderRadius: '10px'
            }}>
            <FormControlLabel
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
        </Box>
    ));
    return <>{renderedOutput}</>;
};

export default ItemCheckBoxList;
