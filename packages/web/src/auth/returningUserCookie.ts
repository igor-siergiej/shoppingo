// The landing site at shoppingo.imapps.uk sends visitors carrying this cookie straight to the app,
// so people who have signed in before skip the marketing page. The app lives on a sibling host
// (shoppingo-app.imapps.uk), so the cookie is scoped to imapps.uk for the landing site to see
// it; it holds no identifier. Sign-out leaves it in place: a signed-out returning user should
// reach the app's login page, not the landing page.
const COOKIE_DOMAIN = 'imapps.uk';
const APP_HOSTS: Record<string, true> = { 'shoppingo-app.imapps.uk': true, 'shoppingo.imapps.uk': true };
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Null on any other host (local dev, self-hosted copies, other imapps apps).
export const returningUserCookie = (host: string): string | null =>
    APP_HOSTS[host]
        ? `shoppingo_app=1; Domain=${COOKIE_DOMAIN}; Path=/; Max-Age=${MAX_AGE_SECONDS}; Secure; SameSite=Lax`
        : null;
