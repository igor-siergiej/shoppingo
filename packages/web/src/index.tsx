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
import { getAuthConfig } from './config/auth';

// Set up PWA install prompt listener as early as possible
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Global storage for the install prompt
declare global {
    interface Window {
        __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
        __pwaInstallAvailable?: boolean;
    }
}

// Set up the event listener immediately
window.__pwaInstallAvailable = false;
window.__deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();

    const event = e as BeforeInstallPromptEvent;

    window.__deferredInstallPrompt = event;
    window.__pwaInstallAvailable = true;
});

window.addEventListener('appinstalled', () => {
    window.__deferredInstallPrompt = null;
    window.__pwaInstallAvailable = false;
});

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
            </ConfigLoader>
        </ErrorBoundary>
    );
};

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(<App />);
