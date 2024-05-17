import {
    Box,
    FormControlLabel,
    Checkbox,
    IconButton,
    Divider,
    CircularProgress,
} from '@mui/material';
import { updateItem, deleteItem } from '../../api';
import { useState } from 'react';
import { Item } from '../../types';
import CircleCheckedFilled from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ClearIcon from '@mui/icons-material/Clear';
import theme from '../../style/theme';

export interface ItemCheckBoxProps {
    item: Item;
    listName: string;
    refetch: () => void;
}

const ItemCheckBox = ({ item, listName, refetch }: ItemCheckBoxProps) => {
    const [isUpdateLoading, setIsUpdateLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const handleUpdateItem = async () => {
        setIsUpdateLoading(true);
        await updateItem(item.name, !item.isSelected, listName);
        await refetch();
        setIsUpdateLoading(false);
    };

    const handleDeleteItem = async () => {
        setIsDeleteLoading(true);
        await deleteItem(item.name, listName);
        await refetch();
        setIsDeleteLoading(false);
    };

    return (
        <Box
            key={item.name}
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pb: '0.5em',
            }}
        >
            <FormControlLabel
                sx={{ flexGrow: 1 }}
                control={
                    isUpdateLoading ? (
                        <Loading />
                    ) : (
                        <Checkbox
                            icon={<RadioButtonUncheckedIcon />}
                            checkedIcon={<CircleCheckedFilled />}
                            size="medium"
                            sx={{ pt: '0.3em' }}
                            color="secondary"
                            checked={item.isSelected}
                            onChange={handleUpdateItem}
                        />
                    )
                }
                label={item.name}
            />

            {isDeleteLoading ? (
                <Loading />
            ) : (
                <IconButton sx={{}} color="inherit" onClick={handleDeleteItem}>
                    <ClearIcon />
                </IconButton>
            )}

            <Divider />
        </Box>
    );
};

export default ItemCheckBox;

export const Loading = () => {
    return (
        <Box
            sx={{
                color: theme.palette.primary.main,
            }}
        >
            <CircularProgress size="2rem" />
        </Box>
    );
};
