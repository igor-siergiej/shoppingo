import './index.css';

import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import AppInitializer from './components/AppInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './components/RootLayout';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import ItemsPage from './pages/ItemsPage';
import ListPage from './pages/ListsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { registerPWA } from './pwa';
import { loadConfig } from './utils/config';

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
        path: '/register',
        element: (
            <RootLayout showLayout={false}>
                <RegisterPage />
            </RootLayout>
        ),
    },
    {
        path: '/',
        element: (
            <AppInitializer>
                <ProtectedRoute>
                    <RootLayout />
                </ProtectedRoute>
            </AppInitializer>
        ),
        children: [
            {
                index: true,
                element: <ListPage />,
            },
            {
                path: 'list/:listTitle',
                element: <ItemsPage />,
            },
        ],
    },
]);

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

const initializeApp = async () => {
    try {
        await loadConfig();

        registerPWA();

        root.render(
            <QueryClientProvider client={queryClient}>
                <UserProvider>
                    <AuthProvider>
                        <RouterProvider router={router} />
                    </AuthProvider>
                </UserProvider>
            </QueryClientProvider>
        );
    } catch (error) {
        root.render(
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#f5f5f5'
            }}
            >
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: '500px'
                }}
                >
                    <h1 style={{ color: '#e53e3e', marginBottom: '1rem' }}>
                        Configuration Error
                    </h1>
                    <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
                        The application failed to load its configuration.
                    </p>
                    <p style={{ color: '#718096', fontSize: '0.9rem' }}>
                        {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3182ce',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }
};

initializeApp();
