import {
    type Auth,
    PLACEHOLDER_EMAIL_DOMAIN,
    USERNAME_MAX_LENGTH,
    USERNAME_MIN_LENGTH,
} from '../../src/infrastructure/BetterAuth';

/** A document from kivo's `users` collection, with `_id` already turned into its hex string. */
export interface KivoUser {
    _id: string;
    username: string;
    passwordHash: string;
    createdAt?: Date;
}

export interface ImportResult {
    created: number;
    skipped: number;
    rejected: Array<{ username: string; reason: string }>;
}

// Better Auth's default username validator; sign-in refuses anything else, so importing it would strand the user.
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
// kivo wrote argon2id, and bcrypt before that; Bun.password.verify (our verifier) handles both.
const SUPPORTED_HASH = /^\$(argon2(id|i|d)|2[aby])\$/;

const unsignableReason = ({ username, passwordHash }: KivoUser): string | undefined => {
    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
        return `username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`;
    }
    if (!USERNAME_PATTERN.test(username)) return 'username may only contain letters, digits, _ and .';
    if (!SUPPORTED_HASH.test(passwordHash)) return 'password hash is neither argon2 nor bcrypt';
    return undefined;
};

/**
 * Copies kivo users into Better Auth, keeping kivo's id so every list, recipe and share that
 * references the user still points at them, and keeping the password hash so they sign in unchanged.
 * Idempotent: users whose id already exists are skipped. With `apply: false` nothing is written.
 */
export const importKivoUsers = async (
    auth: Auth,
    users: Array<KivoUser>,
    opts: { apply: boolean }
): Promise<ImportResult> => {
    const ctx = await auth.$context;
    const result: ImportResult = { created: 0, skipped: 0, rejected: [] };
    // Catches case-variant duplicates within this batch on a dry run, where nothing reaches the store.
    const claimed = new Set<string>();

    for (const kivo of users) {
        const existing = await ctx.adapter.findOne({ model: 'user', where: [{ field: 'id', value: kivo._id }] });
        if (existing) {
            result.skipped++;
            continue;
        }
        const reason = unsignableReason(kivo);
        if (reason) {
            result.rejected.push({ username: kivo.username, reason });
            continue;
        }
        const username = kivo.username.toLowerCase();
        const holder = await ctx.adapter.findOne({ model: 'user', where: [{ field: 'username', value: username }] });
        if (holder || claimed.has(username)) {
            result.rejected.push({ username: kivo.username, reason: 'username already taken' });
            continue;
        }
        claimed.add(username);
        result.created++;
        if (!opts.apply) continue;

        const now = new Date();
        await ctx.adapter.create({
            model: 'user',
            forceAllowId: true,
            data: {
                id: kivo._id,
                name: kivo.username,
                email: `${crypto.randomUUID()}@${PLACEHOLDER_EMAIL_DOMAIN}`,
                emailVerified: false,
                username,
                displayUsername: kivo.username,
                createdAt: kivo.createdAt ?? now,
                updatedAt: now,
            },
        });
        await ctx.internalAdapter.linkAccount({
            userId: kivo._id,
            providerId: 'credential',
            accountId: kivo._id,
            password: kivo.passwordHash,
        });
    }
    return result;
};

/** Sets a new password for a password user and signs them out of every device. */
export const resetPassword = async (auth: Auth, username: string, newPassword: string): Promise<void> => {
    const ctx = await auth.$context;
    const { minPasswordLength, maxPasswordLength } = ctx.password.config;
    if (newPassword.length < minPasswordLength || newPassword.length > maxPasswordLength) {
        throw new Error(`Password must be at least ${minPasswordLength} and at most ${maxPasswordLength} characters`);
    }
    const user = await ctx.adapter.findOne<{ id: string }>({
        model: 'user',
        where: [{ field: 'username', value: username.toLowerCase() }],
    });
    if (!user) throw new Error(`No user with username ${username}`);
    if (!(await ctx.internalAdapter.findCredentialAccount(user.id))) {
        throw new Error(`${username} signs in with Google only and has no password to reset`);
    }
    await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(newPassword));
    await ctx.internalAdapter.deleteUserSessions(user.id);
};
