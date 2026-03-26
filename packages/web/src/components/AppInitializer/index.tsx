import { tryRefreshToken, useAuth } from '@imapps/web-utils';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthConfig } from '../../config/auth';
import { usePWA } from '../../hooks/usePWA';
import LoadingPage from '../LoadingPage';

interface AppInitializerProps {
    children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [timeoutReached, setTimeoutReached] = useState(false);
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const { isUpdating } = usePWA();

    useEffect(() => {
        const timer = setTimeout(() => setTimeoutReached(true), 10000);
        const config = getAuthConfig();

        const initializeAuth = async () => {
            try {
                const newToken = await tryRefreshToken(config);
                if (newToken) {
                    login(newToken);
                } else {
                    logout();
                }
            } catch (error) {
                console.warn('Token refresh failed during initialization', error);
                logout();
            } finally {
                clearTimeout(timer);
                setIsReady(true);
            }
        };

        initializeAuth();

        return () => clearTimeout(timer);
    }, [login, logout]);

    useEffect(() => {
        const handleSessionExpired = () => {
            logout();
            navigate('/login');
        };

        window.addEventListener('auth:session-expired', handleSessionExpired);

        return () => {
            window.removeEventListener('auth:session-expired', handleSessionExpired);
        };
    }, [logout, navigate]);

    return (
        <AnimatePresence mode="wait">
            {isUpdating ? (
                <LoadingPage key="updating" />
            ) : !isReady ? (
                <LoadingPage key="loading" timeoutReached={timeoutReached} />
            ) : (
                <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ height: '100%' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AppInitializer;
