import { describe, expect, it } from 'vitest';
import { returningUserCookie } from './returningUserCookie';

describe('returningUserCookie', () => {
    it('scopes the cookie to imapps.uk from the app host, so the landing site on the sibling host can read it', () => {
        expect(returningUserCookie('shoppingo-app.imapps.uk')).toBe(
            'shoppingo_app=1; Domain=imapps.uk; Path=/; Max-Age=31536000; Secure; SameSite=Lax'
        );
    });

    it('also sets it while the app is still served on the apex', () => {
        expect(returningUserCookie('shoppingo.imapps.uk')).toContain('Domain=imapps.uk');
    });

    it.each(['localhost', 'jewellery-catalogue.imapps.uk', 'kivo.imapps.uk', 'imapps.uk', 'shoppingo.example.com'])(
        'sets nothing on %s',
        (host) => {
            expect(returningUserCookie(host)).toBeNull();
        }
    );
});
