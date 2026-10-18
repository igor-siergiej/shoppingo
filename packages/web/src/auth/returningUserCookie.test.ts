import { describe, expect, it } from 'vitest';
import { returningUserCookie } from './returningUserCookie';

describe('returningUserCookie', () => {
    it('scopes the cookie to shoppingo.imapps.uk from the app subdomain, so the landing site can read it', () => {
        expect(returningUserCookie('app.shoppingo.imapps.uk')).toBe(
            'shoppingo_app=1; Domain=shoppingo.imapps.uk; Path=/; Max-Age=31536000; Secure; SameSite=Lax'
        );
    });

    it('also sets it on the apex itself', () => {
        expect(returningUserCookie('shoppingo.imapps.uk')).toContain('Domain=shoppingo.imapps.uk');
    });

    it.each(['localhost', 'shoppingo.example.com', 'notshoppingo.imapps.uk', 'imapps.uk'])(
        'sets nothing on %s',
        (host) => {
            expect(returningUserCookie(host)).toBeNull();
        }
    );
});
