import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import theme from './style/theme';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import ItemsPage from './pages/ItemsPage';
import ListPage from './pages/ListsPage';

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

root.render(
    <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </ThemeProvider>
);
