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

// Lazy load pages for better performance
const ItemsPage = React.lazy(() => import('./pages/ItemsPage'));
const ListPage = React.lazy(() => import('./pages/ListsPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));

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
    // Initialize performance monitoring
    initPerformanceMonitoring();
    markPerformance('app-initialization-start');

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
