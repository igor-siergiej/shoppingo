import { type ReactElement, useState, useEffect } from 'react';
import './App.css';
import { useQuery } from 'react-query';
import { FormGroup, Box, Toolbar, AppBar, Typography } from '@mui/material';
import { getItems } from './api';
import ItemCheckBoxList from './components/ItemCheckBoxList';
import { type Item } from './types';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

function App(): ReactElement {
    const { data, isLoading, isError } = useQuery('getItems', getItems);
    const [items, setItems] = useState<Item[]>([]);

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

    return (
        <>
            <Box
                sx={{
                    flexGrow: 1,
                    mb: '0.5em'
                }}>
                <AppBar
                    position="static"
                    sx={{
                        backgroundColor: '#618c63',
                        textAlign: 'center'
                    }}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            Shoppingo
                        </Typography>
                        <IconButton color="inherit">
                            <DeleteIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
            </Box>
            <FormGroup
                sx={{
                    display: 'flex'
                }}>
                <ItemCheckBoxList
                    items={itemData}
                    handleOnChange={handleOnChange}></ItemCheckBoxList>
            </FormGroup>
            <Box
                sx={{
                    mb: '0.5em',
                    pl: '0.5em',
                    border: 3,
                    borderColor: '#c8e4be',
                    backgroundColor: '#d8f7cd',
                    borderRadius: '10px',
                    textAlign: 'center'
                }}>
                <IconButton>
                    <AddIcon />
                </IconButton>
            </Box>
        </>
    );
}

export default App;
