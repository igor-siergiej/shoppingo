import './index.css';

import React, { Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import AppInitializer from './components/AppInitializer';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './components/RootLayout';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { registerPWA } from './pwa';
import { getConfigState, loadConfig } from './utils/config';

const lazyLoadPage = (importFn: () => Promise<any>, fallbackName: string) =>
    React.lazy(() =>
        Promise.all([
            importFn(),
            new Promise(resolve => setTimeout(resolve, 100)) // Small delay to ensure React context is ready
        ]).then(([module]) => module).catch(() => ({
            default: () => (
                <div>
                    Failed to load
                    {fallbackName}
                </div>
            )
        }))
    );

const ItemsPage = lazyLoadPage(() => import('./pages/ItemsPage'), 'items page');
const ListPage = lazyLoadPage(() => import('./pages/ListsPage'), 'lists page');
const LoginPage = lazyLoadPage(() => import('./pages/LoginPage'), 'login page');
const RegisterPage = lazyLoadPage(() => import('./pages/RegisterPage'), 'register page');

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
                <Suspense fallback={<LoadingSpinner message="Loading login..." />}>
                    <LoginPage />
                </Suspense>
            </RootLayout>
        ),
    },
    {
        path: '/register',
        element: (
            <RootLayout showLayout={false}>
                <Suspense fallback={<LoadingSpinner message="Loading registration..." />}>
                    <RegisterPage />
                </Suspense>
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
                element: (
                    <Suspense fallback={<LoadingSpinner message="Loading lists..." />}>
                        <ListPage />
                    </Suspense>
                ),
            },
            {
                path: 'list/:listTitle',
                element: (
                    <Suspense fallback={<LoadingSpinner message="Loading items..." />}>
                        <ItemsPage />
                    </Suspense>
                ),
            },
        ],
    },
]);

const App: React.FC = () => {
    const [configLoaded, setConfigLoaded] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);

    useEffect(() => {
        const initializeConfig = async () => {
            try {
                await loadConfig();
            } catch {
                const configState = getConfigState();

                if (configState.error) {
                    setConfigError(configState.error);
                }
            } finally {
                setConfigLoaded(true);
            }
        };

        initializeConfig();
    }, []);

    if (!configLoaded) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading Shoppingo...</div>
                {configError && (
                    <div className="text-red-600 text-sm mt-2 text-center max-w-md">
                        Failed to load configuration:
                        {' '}
                        {configError}
                        <br />
                    </div>
                )}
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <UserProvider>
                    <AuthProvider>
                        <RouterProvider router={router} />
                    </AuthProvider>
                </UserProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

registerPWA();

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(<App />);
