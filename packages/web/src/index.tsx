import './index.css';

import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import ItemsPage from './pages/ItemsPage';
import ListPage from './pages/ListsPage';
import LoginPage from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './components/RootLayout';
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
        path: '/login',
        element: (
            <RootLayout showLayout={false}>
                <LoginPage />
            </RootLayout>
        ),
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <RootLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <ListPage />,
            },
            {
                path: 'list/:listName',
                element: <ItemsPage />,
            },
        ],
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
