// Origins the browser can send Authorization headers from. See shoppingo #108. The app lives on
// `https://app.tandra.uk`; the `https://tandra.uk` apex serves the landing site (shoppingo-site)
// and the earlier hosts (`shoppingo.imapps.co.uk`, `shoppingo-app.imapps.uk`) only redirect to the
// app (packages/web/nginx.conf), so none of them are listed.
//
// Live in their own module so both `index.ts` (Hono CORS + Better Auth `trustedOrigins`) and
// `dependencies/index.ts` (Better Auth factory registered for DI) can read the exact same list
// without a circular import.
export const allowedOrigins: Array<string> = [
    'http://shoppingo.imapps.staging',
    'http://localhost:4000',
    'https://app.tandra.uk',
];
