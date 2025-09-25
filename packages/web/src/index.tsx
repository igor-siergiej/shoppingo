import './index.css';

import {
    AuthConfigProvider,
    AuthProvider,
    ProtectedRoute,
    UserProvider } from '@igor-siergiej/web-utils';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import AppInitializer from './components/AppInitializer';
import ConfigLoader from './components/ConfigLoader';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { RootLayout } from './components/RootLayout';
import RouterErrorHandler from './components/RouterErrorHandler';
import { UpdatePrompt } from './components/UpdatePrompt';
import { getAuthConfig } from './config/auth';
import { registerPWA } from './pwa';
import { handleVersionUpdate } from './utils/version';

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

const AppContent: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthConfigProvider config={getAuthConfig()}>
                <UserProvider>
                    <AuthProvider>
                        <RouterProvider router={router} />
                    </AuthProvider>
                </UserProvider>
            </AuthConfigProvider>
        </QueryClientProvider>
    );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <ConfigLoader>
                <AppContent />
                <UpdatePrompt />
            </ConfigLoader>
        </ErrorBoundary>
    );
};

if (__IS_PROD__) {
    // Initialize PWA with proper version handling
    (async () => {
        try {
            // Handle version updates (clears cache if version changed)
            const wasUpdated = await handleVersionUpdate();

            if (wasUpdated) {
                // Force a complete reload to ensure new version loads
                setTimeout(() => {
                    window.location.reload();
                }, 500);

                return; // Don't register PWA yet, let reload happen first
            }

            // Register PWA
            registerPWA();
        } catch (error) {
            console.error('PWA initialization failed:', error);
            // Still try to register PWA even if version handling fails
            registerPWA();
        }
    })();
}

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(<App />);
