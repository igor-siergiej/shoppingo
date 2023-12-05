import { FormControlLabel, Checkbox, Box, Divider } from '@mui/material';
import { type Item } from '../../types';
import { type ItemCheckBoxListProps } from './types';

import CircleCheckedFilled from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

const ItemCheckBoxList = ({ items, handleOnChange }: ItemCheckBoxListProps) => {
    const renderedOutput = items.map((item: Item) => (
        <Box
            key={item.name}
            sx={{
                mt: '0.5em',
                mb: '0.5em',
                pl: '0.5em',
            }}
        >
            <FormControlLabel
                sx={{ alignItems: 'center', pb: '1em' }}
                control={
                    <Checkbox
                        icon={<RadioButtonUncheckedIcon />}
                        checkedIcon={<CircleCheckedFilled />}
                        sx={{ transform: 'scale(1.5)', pr: '1.5em' }}
                        size="small"
                        color="secondary"
                        checked={item.isSelected}
                        onChange={() => {
                            handleOnChange(item);
                        }}
                    />
                }
                label={item.name}
            />
            <Divider />
        </Box>
    ));
    return renderedOutput;
};

export default ItemCheckBoxList;
