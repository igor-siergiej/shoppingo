import { type ReactElement } from 'react';
import logo from './logo.svg';
// import { getAllItems } from './getAllItems';
import './App.css';
// import { db } from './dbConnection';
function App(): ReactElement {
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
            onClick={(e: any) => {
              // void getAllItems();
            }}>
            {' '}
            Hello{' '}
          </button>
        </header>
      </div>
    </>
  );
}

export default App;
