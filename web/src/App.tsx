import { type ReactElement, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { useQuery } from 'react-query';

interface Item {
  name: string;
  isSelected: boolean;
}

function App(): ReactElement {
  const [show, setShow] = useState(false);
  const { data, isLoading, isError } = useQuery('get_all_items', fetchItems);
  const items: Item[] = data;
  return (
    <>
      <div className="App">
        <header className="App-header">
          <img src={logo.toString()} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer">
            Learn React
          </a>
          <button
            onClick={() => {
              setShow(!show);
            }}>
            Get all Items
          </button>
        </header>
        {show && itemComponent(items, isLoading, isError)}
      </div>
    </>
  );
}

function itemComponent(items: Item[], isLoading: boolean, isError: boolean) {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error fetching data.</div>;
  }

  const renderedOutput = items.map((item: Item, index: number) => (
    <div key={index}>
      {index}: {item.name}
    </div>
  ));

  return <div>{renderedOutput}</div>;
}

async function fetchItems() {
  const response = await fetch('https://shoppingo-api.onrender.com/users');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return await response.json();
}

export default App;
