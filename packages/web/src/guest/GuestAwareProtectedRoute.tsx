import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute, useAuth } from '../auth';
import LoadingPage from '../components/LoadingPage';
import { useGuest } from './GuestContext';

interface GuestAwareProtectedRouteProps {
    children: ReactNode;
}

// Routes wrapped by this component accept either an authenticated session or
// an active guest session. Logged-out visitors are bounced to /login.
export const GuestAwareProtectedRoute = ({ children }: GuestAwareProtectedRouteProps) => {
    const { isAuthenticated } = useAuth();
    const { isGuest } = useGuest();
    const location = useLocation();

    if (isAuthenticated || isGuest) {
        return <>{children}</>;
    }

    return <Navigate to="/login" state={{ from: location }} replace />;
};

// When a route requires an actual account (AI, sharing, calendar, friends)
// wrap it with this. Guests get the same auth wall plus a CTA to register or
// log in, so the page never silently fails for them.
export const RequireAuth = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const { isGuest } = useGuest();

    if (isAuthenticated) {
        return <>{children}</>;
    }

    if (isGuest) {
        return <Navigate to="/signup-cta" state={{ reason: 'auth-required' }} replace />;
    }

    // Not logged in and not in guest mode: defer to the existing behaviour so
    // we don't fork the auth flow.
    return <ProtectedRoute>{children}</ProtectedRoute>;
};

// Deep-link entry point (`/try`) so the landing site can drop a visitor
// straight into guest mode. Signed-in users just go to their lists. The
// redirect waits for the flag to land: navigating first would hit the
// guard at `/` while the visitor is still logged out and bounce to /login.
export const GuestEntryRoute = () => {
    const { isAuthenticated } = useAuth();
    const { isGuest, enterGuestMode } = useGuest();

    useEffect(() => {
        if (!isAuthenticated && !isGuest) enterGuestMode();
    }, [isAuthenticated, isGuest, enterGuestMode]);

    if (isAuthenticated || isGuest) return <Navigate to="/" replace />;
    return <LoadingPage />;
};
