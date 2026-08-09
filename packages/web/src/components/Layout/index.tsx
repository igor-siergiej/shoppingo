import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshContext';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../PullToRefreshIndicator';

interface LayoutProps {
    children: ReactNode;
}

// Routes whose content needs normal (top-anchored, non-reversed) scroll semantics.
// Every other route keeps the default flex-col-reverse (bottom-anchored, chat-like)
// container. See Layout/index.test.tsx and CalendarPage/index.tsx's own comment for
// why flex-col-reverse's scrollTop behavior can't be trusted once content overflows:
// it broke pull-to-refresh's "am I at the top" check on the Recipes page, which has
// no need for bottom-anchoring in the first place.
const NORMAL_SCROLL_ROUTES = new Set(['/recipes']);

export const Layout = ({ children }: LayoutProps) => {
    const { executeRefresh } = usePullToRefreshContext();
    const { scrollRef, pullY, isRefreshing, hasTriggered } = usePullToRefresh(executeRefresh);
    const { pathname } = useLocation();

    const flexDirectionClass = NORMAL_SCROLL_ROUTES.has(pathname) ? 'flex-col' : 'flex-col-reverse';

    return (
        <div className="fixed top-14 md:top-16 bottom-24 left-0 right-0 px-4 py-2 max-w-[500px] mx-auto">
            <PullToRefreshIndicator pullY={pullY} isRefreshing={isRefreshing} hasTriggered={hasTriggered} />
            <div ref={scrollRef} className={`h-full overflow-y-auto flex ${flexDirectionClass} overscroll-y-contain`}>
                {children}
            </div>
        </div>
    );
};
