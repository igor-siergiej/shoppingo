// Origins the browser can send Authorization headers from. See shoppingo #108. The app lives on
// the `https://tandra.uk` apex; its earlier hosts (`shoppingo.imapps.co.uk`,
// `shoppingo-app.imapps.uk`) only redirect there (packages/web/nginx.conf), and
// `https://shoppingo.imapps.uk` serves the landing site (shoppingo-site), so none of them are
// listed.
//
// Live in their own module so both `index.ts` (Hono CORS + Better Auth `trustedOrigins`) and
// `dependencies/index.ts` (Better Auth factory registered for DI) can read the exact same list
// without a circular import.
export const allowedOrigins: Array<string> = [
    'http://shoppingo.imapps.staging',
    'http://localhost:4000',
    'https://tandra.uk',
];
