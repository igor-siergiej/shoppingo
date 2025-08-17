import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

import { extractUserFromToken } from '../utils/jwtUtils';

export interface UserInfo {
    username: string;
    id: string;
}

interface UserContextType {
    user: UserInfo | null;
    setUser: (user: UserInfo | null) => void;
    updateUserFromToken: (token: string) => void;
    clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserInfo | null>(null);

    const updateUserFromToken = useCallback((token: string) => {
        const userInfo = extractUserFromToken(token);
        console.log('userInfo', userInfo);
        if (userInfo) {
            setUser(userInfo);
        } else {
            console.warn('Could not extract user information from token');
            setUser(null);
        }
    }, []);

    const clearUser = useCallback(() => {
        setUser(null);
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, updateUserFromToken, clearUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
