import { type ReactElement } from 'react';
import './App.css';
import { useQuery } from 'react-query';

interface Item {
    name: string;
    selected: boolean;
}

function App(): ReactElement {
    const { data, isLoading, isError } = useQuery('get_all_items', fetchItems);
    return (
        <>
            <div className="App">{itemComponent(data, isLoading, isError)}</div>
        </>
    );
}

function itemComponent(data: any, isLoading: boolean, isError: boolean) {
    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (isError) {
        return <div>Error fetching data.</div>;
    }

    console.log(data);

    const renderedOutput = data.map((item: Item, index: number) => (
        <div key={index}>
            {index}: {item.name}, {item.selected ? 'true' : 'false'}
        </div>
    ));

    return <div>{renderedOutput}</div>;
}

const URL = 'https://shoppingo-api.onrender.com';

async function fetchItems() {
    const response = await fetch(`${URL}/items`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.json();
}

export default App;
