import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { usePWA } from '../../hooks/usePWA';
import { onIntentsDiscarded, startDrainer } from '../../offline/drainer';
import { outboxStore } from '../../offline/outboxStore';
import LoadingPage from '../LoadingPage';

interface AppInitializerProps {
    children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
    const [timeoutReached, setTimeoutReached] = useState(false);
    const { isAuthenticated, isLoading, logout } = useAuth();
    const navigate = useNavigate();
    const { isUpdating } = usePWA();
    const queryClient = useQueryClient();
    // Read inside the event handler without re-subscribing on every session change.
    const isAuthenticatedRef = useRef(isAuthenticated);
    isAuthenticatedRef.current = isAuthenticated;

    useEffect(() => {
        if (!isLoading) return;
        const timer = setTimeout(() => setTimeoutReached(true), 10000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    useEffect(() => {
        let stop = () => {};
        void outboxStore.hydrate().then(() => {
            stop = startDrainer();
        });
        return () => stop();
    }, []);

    useEffect(() => onIntentsDiscarded(() => void queryClient.invalidateQueries()), [queryClient]);

    useEffect(() => {
        // A 401 from the api means the session cookie expired or was revoked. Guests also get 401s
        // from account-only endpoints; they have no session to lose, so they stay where they are.
        const handleSessionExpired = () => {
            if (!isAuthenticatedRef.current) return;
            void logout();
            const { pathname, search, hash } = window.location;
            navigate('/login', { state: { from: { pathname, search, hash } } });
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
            ) : isLoading ? (
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
