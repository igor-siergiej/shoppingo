import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import Appbar from '../Appbar';
import { Layout } from '../Layout';
import NetworkStatusAlert from '../NetworkStatusAlert';

interface RootLayoutProps {
    children?: ReactNode;
    showLayout?: boolean;
}

export const RootLayout = ({ children, showLayout = true }: RootLayoutProps) => {
    const content = children || <Outlet />;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Appbar />
            <NetworkStatusAlert />
            {showLayout
                ? (
                        <Layout>
                            {content}
                        </Layout>
                    )
                : (
                        <main className="flex-1 flex items-center justify-center p-4">
                            <div className="w-full max-w-md">
                                {content}
                            </div>
                        </main>
                    )}
        </div>
    );
};
