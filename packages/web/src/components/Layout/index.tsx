import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="mx-auto pt-2 px-4 max-w-[500px]">
            {children}
        </div>
    );
};
