import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { HOME_PAGE, START_PAGE } from '../constants/routes';
import { useAuth } from '../context/AuthContext';

interface UseAuthRedirectOptions {
    redirectTo?: string;
    redirectFrom?: string;
    condition?: 'authenticated' | 'unauthenticated';
}

export const useAuthRedirect = (options: UseAuthRedirectOptions = {}) => {
    const {
        redirectTo = '/home',
        redirectFrom = '/',
        condition = 'authenticated'
    } = options;

    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const shouldRedirect
            = condition === 'authenticated'
                ? isAuthenticated && location.pathname === redirectFrom
                : !isAuthenticated && location.pathname !== redirectFrom;

        if (shouldRedirect) {
            navigate(redirectTo);
        }
    }, [isAuthenticated, navigate, location.pathname, redirectTo, redirectFrom, condition]);

    return { isAuthenticated };
};

export const useRedirectIfAuthenticated = (to = HOME_PAGE.route, from = '/') => {
    return useAuthRedirect({ redirectTo: to, redirectFrom: from, condition: 'authenticated' });
};

export const useRedirectIfUnauthenticated = (to = START_PAGE.route) => {
    return useAuthRedirect({ redirectTo: to, condition: 'unauthenticated' });
};
