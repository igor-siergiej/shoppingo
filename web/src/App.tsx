import { type ReactElement, useState } from 'react';
import { useQuery } from 'react-query';
import { Box, Button, FormGroup, TextField } from '@mui/material';
import { getItemsQuery, addItem, updateSelected } from './api';
import ItemCheckBoxList from './components/ItemCheckBoxList';
import Appbar from './components/Appbar';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import theme from './theme';
import { Item } from './types';

function App(): ReactElement {
    const { data, isLoading, isError, isRefetching, refetch } = useQuery({
        ...getItemsQuery(),
    });
    const [open, setOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');

    if (isLoading || isRefetching) {
        return <div>Loading...</div>;
    }

    if (isError) {
        return <div>Error fetching data.</div>;
    }

    if (!data) {
        return <div>Loading...</div>;
    }

    const handleOnChange = async (item: Item) => {
        await updateSelected(item.name, !item.isSelected);
        refetch();
    };

    const AddButton = () => {
        return (
            <Button
                onClick={() => {
                    setOpen(!open);
                }}
                variant="contained"
                sx={{
                    border: 3,
                    borderRadius: '10px',
                    textAlign: 'center',
                    width: '100%',
                    backgroundColor: theme.palette.primary.light,
                }}
            >
                <AddIcon />
            </Button>
        );
    };

    const CancelButton = () => {
        return (
            <Button
                onClick={() => {
                    setOpen(false);
                }}
                variant="contained"
                sx={{
                    backgroundColor: theme.palette.primary.light,
                    border: 3,
                    borderRadius: '10px',
                    textAlign: 'center',
                    ml: '0.5em',
                    flex: 1,
                }}
            >
                <CloseIcon />
            </Button>
        );
    };

    const AcceptButton = () => {
        return (
            <Button
                onClick={async () => {
                    await addItem(newItemName);
                    refetch();
                    setOpen(false);
                    setNewItemName('');
                }}
                variant="contained"
                sx={{
                    backgroundColor: theme.palette.primary.light,
                    border: 3,
                    borderRadius: '10px',
                    textAlign: 'center',
                    mr: '0.5em',
                    flex: 1,
                }}
            >
                <CheckIcon />
            </Button>
        );
    };

    return (
        <>
            <Appbar />
            <FormGroup
                sx={{
                    display: 'flex',
                }}
            >
                <ItemCheckBoxList
                    items={data}
                    handleOnChange={handleOnChange}
                ></ItemCheckBoxList>
                {open ? (
                    <>
                        <TextField
                            size="small"
                            value={newItemName}
                            onChange={(event) => {
                                setNewItemName(event.target.value);
                            }}
                            sx={{
                                backgroundColor: theme.palette.primary.light,
                                borderRadius: '10px',
                                mb: '0.5em',
                            }}
                            color="primary"
                            label="Add New Item"
                            variant="filled"
                        />
                        <Box sx={{ width: '100%', display: 'flex' }}>
                            <AcceptButton />
                            <CancelButton />
                        </Box>
                    </>
                ) : (
                    <AddButton />
                )}
            </FormGroup>
        </>
    );
}

export default App;
