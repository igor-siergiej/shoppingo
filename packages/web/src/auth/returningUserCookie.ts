// The landing site at tandra.uk sends visitors carrying this cookie straight to the app, so
// people who have signed in before skip the marketing page. The app lives on app.tandra.uk, so
// the cookie is scoped to tandra.uk for the landing site to see it; it holds no identifier.
// Sign-out leaves it in place: a signed-out returning user should reach the app's login page,
// not the landing page.
const COOKIE_DOMAIN = 'tandra.uk';
const APP_HOST = 'app.tandra.uk';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Null on any other host (local dev, self-hosted copies).
export const returningUserCookie = (host: string): string | null =>
    host === APP_HOST
        ? `tandra_app=1; Domain=${COOKIE_DOMAIN}; Path=/; Max-Age=${MAX_AGE_SECONDS}; Secure; SameSite=Lax`
        : null;
