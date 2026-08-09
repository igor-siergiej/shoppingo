import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { recordInAppNavigation } from '../../utils/navigationHistory';
import Appbar from '../Appbar';
import { Layout } from '../Layout';
import NetworkStatusAlert from '../NetworkStatusAlert';

interface RootLayoutProps {
    children?: ReactNode;
    showLayout?: boolean;
}

export const RootLayout = ({ children, showLayout = true }: RootLayoutProps) => {
    const location = useLocation();
    const content = children || <Outlet />;

    // biome-ignore lint/correctness/useExhaustiveDependencies: location.key drives re-firing on route change, not read in the body.
    useEffect(() => {
        recordInAppNavigation();
    }, [location.key]);

    return (
        <div className="min-h-screen bg-background flex flex-col pt-14 md:pt-16">
            <Appbar />
            <NetworkStatusAlert />
            {showLayout ? (
                <Layout>{content}</Layout>
            ) : (
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-md">{content}</div>
                </main>
            )}
            <Toaster />
        </div>
    );
};
