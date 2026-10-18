/**
 * Page-view tracker. Subscribes to react-router location changes and
 * fires `page` on the analytics module so the analytics backend sees a
 * page-view for each SPA route change.
 *
 * Umami's tracker patches `history.pushState` once it loads, so this is
 * belt-and-braces — it guarantees a view fires even before the script
 * has hydrated (the analytics module's no-op guards make this safe).
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { page } from '../utils/analytics';

const RouteChangeTracker: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        page(location.pathname + location.search);
    }, [location.pathname, location.search]);

    return null;
};

export default RouteChangeTracker;
