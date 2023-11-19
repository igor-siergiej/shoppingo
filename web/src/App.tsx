import { type ReactElement, useState, useEffect } from 'react';
import './App.css';
import { useQuery } from 'react-query';
import { Box, Button, FormGroup, TextField } from '@mui/material';
import { getItems } from './api';
import ItemCheckBoxList from './components/ItemCheckBoxList';
import Appbar from './components/Appbar';
import { type Item } from './types';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import theme from './theme';

function App(): ReactElement {
    const { data, isLoading, isError } = useQuery('getItems', getItems);
    const [items, setItems] = useState<Item[]>([]);
    const [open, setOpen] = useState(false);
    const [itemName, setItemName] = useState('');

    useEffect(() => {
        if (!isLoading) {
            setItems(itemData);
        }
    }, [data]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (isError) {
        return <div>Error fetching data.</div>;
    }

    const itemData = data as Item[];

    const handleOnChange = (inputItem: Item) => {
        const itemIndex = items.indexOf(inputItem);
        items[itemIndex].selected = !inputItem.selected;
        const newItems = [...items];
        setItems(newItems);
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
                    backgroundColor: theme.palette.primary.light
                }}>
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
                    flex: 1
                }}>
                <CloseIcon />
            </Button>
        );
    };

    const AcceptButton = () => {
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
                    mr: '0.5em',
                    flex: 1
                }}>
                <CheckIcon />
            </Button>
        );
    };

    return (
        <>
            <Appbar />
            <FormGroup
                sx={{
                    display: 'flex'
                }}>
                <ItemCheckBoxList
                    items={itemData}
                    handleOnChange={handleOnChange}></ItemCheckBoxList>
                {open ? (
                    <>
                        <TextField
                            size="small"
                            value={itemName}
                            onChange={(event) => {
                                setItemName(event.target.value);
                            }}
                            sx={{
                                backgroundColor: theme.palette.primary.light,
                                borderRadius: '10px',
                                mb: '0.5em'
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
