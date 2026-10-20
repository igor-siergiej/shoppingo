import { type Auth as BetterAuth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { username } from 'better-auth/plugins';

export const PLACEHOLDER_EMAIL_DOMAIN = 'users.invalid';

export interface AuthOptions {
    database: BetterAuthOptions['database'];
    secret: string;
    baseURL: string;
    trustedOrigins: Array<string>;
    google?: { clientId: string; clientSecret: string };
}

export const createAuth = ({ database, secret, baseURL, trustedOrigins, google }: AuthOptions): BetterAuth =>
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
        plugins: [username({ minUsernameLength: 3, maxUsernameLength: 50 })],
        rateLimit: { enabled: true, customRules: { '/sign-in/username': { window: 60, max: 10 } } },
        advanced: { ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
        hooks: {
            before: createAuthMiddleware(async (ctx) => {
                // Placeholder emails are not credentials; passwords sign in by username only.
                if (ctx.path === '/sign-in/email') throw new APIError('NOT_FOUND');
                if (ctx.path !== '/sign-up/email') return;
                const name = typeof ctx.body?.username === 'string' ? ctx.body.username.trim() : '';
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

export type Auth = BetterAuth;
