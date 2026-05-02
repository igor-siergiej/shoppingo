import type { ReactNode } from 'react';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshContext';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../PullToRefreshIndicator';

interface LayoutProps {
    children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const { executeRefresh } = usePullToRefreshContext();
    const { scrollRef, pullY, isRefreshing, hasTriggered } = usePullToRefresh(executeRefresh);

    return (
        <div className="fixed top-16 bottom-24 left-0 right-0 px-4 py-2 max-w-[500px] mx-auto">
            <PullToRefreshIndicator pullY={pullY} isRefreshing={isRefreshing} hasTriggered={hasTriggered} />
            <div ref={scrollRef} className="h-full overflow-y-auto flex flex-col-reverse overscroll-y-contain">
                {children}
            </div>
        </div>
    );
};
