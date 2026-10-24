// The guest-mode on/off switch, kept in localStorage so a guest can refresh the page (or close the tab
// and come back) and still find their lists. `GuestContext` owns it; analytics reads it to tag events.

export const GUEST_FLAG_KEY = 'tandra:guest-mode';

export const readGuestFlag = (): boolean => {
    try {
        return localStorage.getItem(GUEST_FLAG_KEY) === '1';
    } catch {
        return false;
    }
};

export const writeGuestFlag = (on: boolean): void => {
    try {
        if (on) localStorage.setItem(GUEST_FLAG_KEY, '1');
        else localStorage.removeItem(GUEST_FLAG_KEY);
    } catch {
        // localStorage can throw in private modes; the in-memory flag still tracks the session.
    }
};
