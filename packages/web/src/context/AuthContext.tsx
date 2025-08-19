import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useUser } from './UserContext';

interface AuthContextType {
    accessToken: string | null;
    isAuthenticated: boolean;
    login: (accessToken: string) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(() => {
        // Initialize from localStorage if available
        const stored = localStorage.getItem('accessToken');

        return stored || null;
    });
    const { updateUserFromToken, clearUser } = useUser();

    useEffect(() => {
        if (accessToken) {
            updateUserFromToken(accessToken);
        } else {
            clearUser();
        }
    }, [accessToken, updateUserFromToken, clearUser]);

    const login = useCallback((token: string) => {
        setAccessToken(token);
        localStorage.setItem('accessToken', token);
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch(`/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            setAccessToken(null);
            localStorage.removeItem('accessToken');
        }
    }, []);

    const contextValue = useMemo(() => {
        const isAuth = !!accessToken;

        return {
            accessToken,
            isAuthenticated: isAuth,
            login,
            logout
        };
    }, [accessToken, login, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};
