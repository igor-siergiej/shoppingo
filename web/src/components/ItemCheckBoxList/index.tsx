import { FormControlLabel, Checkbox, Box } from '@mui/material';
import { type Item } from '../../types';
import theme from '../../theme';

interface ItemCheckBoxListProps {
    items: Item[];
    handleOnChange: (arg0: Item) => void;
}

const ItemCheckBoxList = ({ items, handleOnChange }: ItemCheckBoxListProps) => {
    const renderedOutput = items.map((item: Item) => (
        <Box
            key={item.name}
            sx={{
                backgroundColor: theme.palette.primary.light,
                mb: '0.5em',
                border: 3,
                borderColor: theme.palette.primary.contrastText,
                pl: '0.5em',
                borderRadius: '10px'
            }}>
            <FormControlLabel
                control={
                    <Checkbox
                        size="medium"
                        color="secondary"
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
