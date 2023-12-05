import { type ReactElement, useState } from 'react';
import { useQuery } from 'react-query';
import { Box, Button, FormGroup, TextField, Toolbar } from '@mui/material';
import { getItemsQuery, addItem } from '../../api';
import ItemCheckBoxList from '../ItemCheckBoxList';
import Appbar from '../Appbar';
import AddIcon from '@mui/icons-material/Add';
import AcceptButton from '../AcceptButton';
import CancelButton from '../CancelButton';

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

    const handleOnChange = () => {};

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
                }}
            >
                <AddIcon />
            </Button>
        );
    };

    const handleAddItem = async () => {
        await addItem(newItemName);
        refetch();
        setOpen(false);
        setNewItemName('');
    };

    return (
        <>
            <Appbar />
            <Toolbar />
            <FormGroup
                sx={{
                    display: 'flex',
                    pb: '10em',
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
                                borderRadius: '10px',
                                mb: '0.5em',
                            }}
                            color="primary"
                            label="Add New Item"
                            variant="filled"
                        />
                        <Box sx={{ width: '100%', display: 'flex' }}>
                            <AcceptButton
                                handleClick={() => {
                                    handleAddItem();
                                }}
                            />
                            <CancelButton
                                handleClick={() => {
                                    setOpen(false);
                                }}
                            />
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
