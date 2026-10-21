import { sessionCache } from './sessionCache';

/** The signed-in user as the domain sees them: an id and a display name, nothing else. */
export interface SessionUser {
    id: string;
    username: string;
}

export interface SessionSnapshot {
    user: SessionUser | null;
    /** Signed in (e.g. through Google) but no username picked yet. */
    needsUsername: boolean;
}

export const SIGNED_OUT: SessionSnapshot = { user: null, needsUsername: false };

interface SessionBody {
    user?: { id: string; username?: string | null; displayUsername?: string | null };
}

const offlineSnapshot = (): SessionSnapshot => {
    const cached = sessionCache.read();
    return cached ? { user: cached, needsUsername: false } : SIGNED_OUT;
};

/**
 * Asks the api who is signed in. A network failure or a server error keeps the cached user so an
 * offline launch still opens the app; only an explicit "no session" (401 or a null body) signs out.
 */
// One request with four outcomes (offline, server error, signed out, signed in); splitting would scatter them.
// fallow-ignore-next-line complexity
export const fetchSession = async (): Promise<SessionSnapshot> => {
    let response: Response;
    try {
        response = await fetch('/api/auth/get-session', { credentials: 'same-origin' });
    } catch {
        return offlineSnapshot();
    }
    if (response.status >= 500) return offlineSnapshot();

    const body: SessionBody | null = response.ok ? await response.json().catch((): null => null) : null;
    if (!body?.user) {
        sessionCache.clear();
        return SIGNED_OUT;
    }
    const username = body.user.displayUsername ?? body.user.username;
    if (!username) {
        sessionCache.clear();
        return { user: null, needsUsername: true };
    }
    const user = { id: body.user.id, username };
    sessionCache.write(user);
    return { user, needsUsername: false };
};
