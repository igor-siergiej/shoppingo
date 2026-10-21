import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { username } from 'better-auth/plugins';

// Reserved TLD that never routes (RFC 2606). Password users get `<uuid>@<this>` so Better
// Auth's `user.email` constraint is satisfied without ever accepting a real address:
// keeping any real email out of the row is what stops an unverified password sign-up from
// later locking a Google user out via `account_not_linked`.
// Exports below are consumed by packages/api/scripts/auth (fallow ignores scripts/).
// fallow-ignore-next-line unused-export
export const PLACEHOLDER_EMAIL_DOMAIN = 'users.invalid';

// Matches the register form's `usernameField` (packages/web/src/hooks/authSchemas.ts).
// fallow-ignore-next-line unused-export
export const USERNAME_MIN_LENGTH = 3;
// fallow-ignore-next-line unused-export
export const USERNAME_MAX_LENGTH = 50;

const rejectEmailSignIn = (path: string) => {
    // Placeholder emails are not credentials; passwords sign in by username only.
    if (path === '/sign-in/email') throw new APIError('NOT_FOUND');
};

const usernameFromBody = (body: unknown): string => {
    const candidate = (body as { username?: unknown })?.username;
    return typeof candidate === 'string' ? candidate.trim() : '';
};

export interface AuthOptions {
    database: BetterAuthOptions['database'];
    secret: string;
    baseURL: string;
    trustedOrigins: Array<string>;
    google?: { clientId: string; clientSecret: string };
}

export const createAuth = ({ database, secret, baseURL, trustedOrigins, google }: AuthOptions) =>
    betterAuth({
        database,
        secret,
        baseURL,
        trustedOrigins,
        emailAndPassword: {
            enabled: true,
            minPasswordLength: 8,
            password: {
                hash: (password) => Bun.password.hash(password, { algorithm: 'argon2id' }),
                verify: ({ hash, password }) => Bun.password.verify(password, hash),
            },
        },
        socialProviders: google
            ? { google: { clientId: google.clientId, clientSecret: google.clientSecret, prompt: 'select_account' } }
            : {},
        plugins: [username({ minUsernameLength: USERNAME_MIN_LENGTH, maxUsernameLength: USERNAME_MAX_LENGTH })],
        rateLimit: { enabled: true, customRules: { '/sign-in/username': { window: 60, max: 10 } } },
        advanced: { ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
        hooks: {
            before: createAuthMiddleware(async (ctx) => {
                rejectEmailSignIn(ctx.path);
                if (ctx.path !== '/sign-up/email') return;
                const name = usernameFromBody(ctx.body);
                if (!name) throw new APIError('BAD_REQUEST', { message: 'Username is required' });
                // Never store a client-supplied email: an unverified real address would squat it and block that
                // person's later Google sign-in (account_not_linked).
                return {
                    context: {
                        ...ctx,
                        body: {
                            ...(ctx.body as Record<string, unknown>),
                            email: `${crypto.randomUUID()}@${PLACEHOLDER_EMAIL_DOMAIN}`,
                            name,
                        },
                    },
                };
            }),
        },
    });

// Inferred rather than better-auth's generic `Auth`, which drops the username plugin's endpoints (`signInUsername`).
export type Auth = ReturnType<typeof createAuth>;
