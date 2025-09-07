import './index.css';

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import AppInitializer from './components/AppInitializer';
import LoadingSpinner from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootLayout } from './components/RootLayout';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { registerPWA } from './pwa';
import { loadConfig } from './utils/config';

// Lazy load pages with proper error boundaries and context delay
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

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

const initializeApp = async () => {
    registerPWA();

    // Render the app immediately with loading state
    root.render(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </UserProvider>
        </QueryClientProvider>
    );

    // Load config in background and handle errors gracefully
    try {
        await loadConfig();
    } catch (error) {
        console.error('Configuration failed to load:', error);
        // Show a toast or notification instead of blocking the entire app
        // The app can still function with default config values
    }
};

initializeApp();
