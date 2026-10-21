// Origins the browser can send Authorization headers from. The app lives on
// `https://app.tandra.uk`; the `https://tandra.uk` apex serves the landing site (tandra-site),
// which never calls the authenticated API, so it is not listed.
//
// Live in their own module so both `index.ts` (Hono CORS + Better Auth `trustedOrigins`) and
// `dependencies/index.ts` (Better Auth factory registered for DI) can read the exact same list
// without a circular import.
export const allowedOrigins: Array<string> = ['http://localhost:4000', 'https://app.tandra.uk'];
