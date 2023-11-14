import { type ReactElement, useState, useEffect } from 'react';
import './App.css';
import { useQuery } from 'react-query';
import { FormGroup, Button } from '@mui/material';
import { getItems } from './api';
import ItemCheckBoxList from './components/ItemCheckBoxList';
import Appbar from './components/Appbar/appbar';
import { type Item } from './types';
import AddIcon from '@mui/icons-material/Add';

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
            <Appbar />
            <FormGroup
                sx={{
                    display: 'flex'
                }}>
                <ItemCheckBoxList
                    items={itemData}
                    handleOnChange={handleOnChange}></ItemCheckBoxList>
            </FormGroup>
            <Button
                sx={{
                    mb: '0.5em',
                    pl: '0.5em',
                    border: 3,
                    borderRadius: '10px',
                    textAlign: 'center',
                    width: '100%'
                }}>
                <AddIcon sx={{ color: 'black' }} />
            </Button>
        </>
    );
}

export default App;
