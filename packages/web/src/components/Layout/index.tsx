import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="fixed top-16 bottom-24 left-0 right-0 px-4 py-2 max-w-[500px] mx-auto">
            <div className="h-full overflow-y-auto flex flex-col-reverse">
                {children}
            </div>
        </div>
    );
};
