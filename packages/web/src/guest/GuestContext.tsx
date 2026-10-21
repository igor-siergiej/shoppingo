import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { logger } from '../utils/logger';
import { guestStore } from './guestStore';

// A guest session lets a visitor try the app without an account. They can
// create lists and items, which are stored locally in IndexedDB; the moment
// they register or log in the data is migrated to the server (see
// `migrateGuestToAccount.ts`) and the guest store is cleared.
//
// The flag lives in localStorage so a guest can refresh the page (or close
// the tab and come back) and still find their lists. The data itself lives
// in IndexedDB via `guestStore`; this context is just the on/off switch.

const STORAGE_KEY = 'tandra:guest-mode';

const readFlag = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
};

const writeFlag = (on: boolean): void => {
    try {
        if (on) localStorage.setItem(STORAGE_KEY, '1');
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // localStorage can throw in private modes; the in-memory flag still tracks the session.
    }
};

export interface GuestContextType {
    /** True when the visitor is in guest mode. Mutually exclusive with an authenticated session. */
    isGuest: boolean;
    /** Opt the visitor into guest mode and route them to the app. */
    enterGuestMode: () => void;
    /**
     * Leave guest mode. Clears the local store too, unless `keepData` is set
     * (sign-in, where the migration decides what to clear).
     */
    exitGuestMode: (options?: { keepData?: boolean }) => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const useGuest = (): GuestContextType => {
    const context = useContext(GuestContext);

    if (context === undefined) {
        throw new Error('useGuest must be used within a GuestProvider');
    }

    return context;
};

export const GuestProvider = ({ children }: { children: ReactNode }) => {
    const [isGuest, setIsGuest] = useState<boolean>(() => readFlag());

    // Keep the flag in sync across tabs/windows so a guest who opens a second
    // tab lands in guest mode there too (and vice-versa for sign-out).
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            setIsGuest(readFlag());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const enterGuestMode = useCallback(() => {
        writeFlag(true);
        setIsGuest(true);
        logger.info('Entered guest mode');
    }, []);

    const exitGuestMode = useCallback((options?: { keepData?: boolean }) => {
        // Wipe local data so the next guest session starts clean and a logged-in
        // user doesn't see a previous stranger's lists if they hand the device over.
        if (!options?.keepData) void guestStore.clear();
        writeFlag(false);
        setIsGuest(false);
        logger.info('Exited guest mode');
    }, []);

    const value = useMemo<GuestContextType>(
        () => ({ isGuest, enterGuestMode, exitGuestMode }),
        [isGuest, enterGuestMode, exitGuestMode]
    );

    return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
};
