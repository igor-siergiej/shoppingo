import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
        // Redirect to login page with the current location as the return path
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    return <>{children}</>;
};
