import './index.css';

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import AppInitializer from './components/AppInitializer';
import ConfigLoader from './components/ConfigLoader';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './components/RootLayout';
import RouterErrorHandler from './components/RouterErrorHandler';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { registerPWA } from './pwa';

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
        errorElement: <RouterErrorHandler />,
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
        errorElement: <RouterErrorHandler />,
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
        errorElement: <RouterErrorHandler />,
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
    return (
        <ErrorBoundary>
            <ConfigLoader>
                <QueryClientProvider client={queryClient}>
                    <UserProvider>
                        <AuthProvider>
                            <RouterProvider router={router} />
                        </AuthProvider>
                    </UserProvider>
                </QueryClientProvider>
            </ConfigLoader>
        </ErrorBoundary>
    );
};

if (__IS_PROD__) {
    registerPWA();
}

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(<App />);
