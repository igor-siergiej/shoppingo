import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'shoppingo:lastSeenVersion';

/** Positive when `a` is a newer release than `b`; 0 when equal. */
export const compareVersions = (a: string, b: string): number => {
    const parse = (version: string) => version.split('.').map((part) => Number.parseInt(part, 10) || 0);
    const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a);
    const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b);

    return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;
};

const readStored = (): string | null => {
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

const writeStored = (version: string) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, version);
    } catch {
        // Storage can be unavailable (private mode, blocked cookies); the panel
        // still works, it just can't remember what has been read.
    }
};

/**
 * Tracks the newest release the user has already read about.
 *
 * A first-time visitor has nothing stored, so they are silently marked as
 * up-to-date rather than greeted with a badge for every past release.
 */
export const useLastSeenVersion = (latestVersion: string) => {
    const [lastSeen, setLastSeen] = useState<string | null>(readStored);

    useEffect(() => {
        if (lastSeen !== null || !latestVersion) return;

        writeStored(latestVersion);
        setLastSeen(latestVersion);
    }, [lastSeen, latestVersion]);

    const markSeen = useCallback(() => {
        if (!latestVersion) return;

        writeStored(latestVersion);
        setLastSeen(latestVersion);
    }, [latestVersion]);

    const hasUnseenRelease = lastSeen !== null && !!latestVersion && compareVersions(latestVersion, lastSeen) > 0;

    return { lastSeen, hasUnseenRelease, markSeen };
};
