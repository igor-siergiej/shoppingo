import { type ReactElement, useState, useEffect } from 'react';
import './App.css';
import { useQuery } from 'react-query';
import { FormGroup } from '@mui/material';
import { getItems } from './api';
import ItemCheckBoxList from './components/ItemCheckBoxList';
import { type Item } from './types';

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
            <FormGroup>
                <ItemCheckBoxList
                    items={itemData}
                    handleOnChange={handleOnChange}></ItemCheckBoxList>
            </FormGroup>
        </>
    );
}

export default App;
