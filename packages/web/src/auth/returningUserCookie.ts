// The landing site at shoppingo.imapps.uk sends visitors carrying this cookie straight to the app,
// so people who have signed in before skip the marketing page. It is scoped to the parent domain
// because the landing site has to read it, and it holds no identifier. Sign-out leaves it in
// place: a signed-out returning user should reach the app's login page, not the landing page.
const COOKIE_DOMAIN = 'shoppingo.imapps.uk';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// Null on hosts outside the domain (local dev, self-hosted copies), where the landing site can't
// read it and the browser would reject the Domain attribute anyway.
export const returningUserCookie = (host: string): string | null =>
    host === COOKIE_DOMAIN || host.endsWith(`.${COOKIE_DOMAIN}`)
        ? `shoppingo_app=1; Domain=${COOKIE_DOMAIN}; Path=/; Max-Age=${MAX_AGE_SECONDS}; Secure; SameSite=Lax`
        : null;
