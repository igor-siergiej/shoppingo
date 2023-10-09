import { type ReactElement, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { useQuery } from 'react-query';

interface Item {
  itemName: string;
  isSelected: false;
}

function App(): ReactElement {
  const [show, setShow] = useState(false);
  const { data, isLoading, isError } = useQuery('yourQueryKey', fetchItems);
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
        {show && itemComponent(data, isLoading, isError)}
      </div>
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

  return (
    <div>
      {data.map((item: Item) => (
        <div key={item.itemName}>{item.isSelected}</div>
      ))}
    </div>
  );
}

async function fetchItems() {
  const response = await fetch('https://shoppingo-api.onrender.com/users');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return await response.json();
}

export default App;
