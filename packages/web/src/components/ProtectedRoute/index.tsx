import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const location = useLocation();
    
    // For now, we'll use a simple localStorage check
    // In a real app, you'd want to check against your auth service
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuthenticated) {
        // Redirect to login page with the current location as the return path
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    return <>{children}</>;
};
