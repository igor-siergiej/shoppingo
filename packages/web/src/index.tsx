import './index.css';

import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import ItemsPage from './pages/ItemsPage';
import ListPage from './pages/ListsPage';
import { listenForInstallPrompt, registerPWA } from './pwa';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

const router = createBrowserRouter([
    {
        path: '/',
        element: <ListPage />,
    },
    {
        path: 'list/:listName',
        element: <ItemsPage />,
    },
]);

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

registerPWA();
listenForInstallPrompt();

root.render(
    <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
    </QueryClientProvider>
);
