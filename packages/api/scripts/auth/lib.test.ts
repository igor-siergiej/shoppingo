import { describe, expect, it } from 'bun:test';
import { memoryAdapter } from 'better-auth/adapters/memory';

import { type AuthOptions, createAuth } from '../../src/infrastructure/BetterAuth';
import { importKivoUsers, type KivoUser, resetPassword } from './lib';

const makeAuth = () => {
    const db: Record<string, unknown[]> = { user: [], session: [], account: [], verification: [], rateLimit: [] };
    const auth = createAuth({
        database: memoryAdapter(db) as unknown as AuthOptions['database'],
        secret: 'test-secret-test-secret-test-secret-123',
        baseURL: 'http://localhost:4000',
        trustedOrigins: ['http://localhost:4000'],
    });
    return { auth, db };
};

const KIVO_ID = '65f0a1b2c3d4e5f6a7b8c9d0';

const kivoUser = async (overrides: Partial<KivoUser> = {}): Promise<KivoUser> => ({
    _id: KIVO_ID,
    username: 'Igor',
    passwordHash: await Bun.password.hash('kivo-pass-1', { algorithm: 'argon2id' }),
    ...overrides,
});

const signIn = (auth: ReturnType<typeof makeAuth>['auth'], username: string, password: string) =>
    auth.api.signInUsername({ body: { username, password } });

describe('importKivoUsers', () => {
    it('keeps the kivo id and display username, hides the email, and keeps the password', async () => {
        const { auth } = makeAuth();
        const result = await importKivoUsers(auth, [await kivoUser()], { apply: true });
        expect(result).toEqual({ created: 1, skipped: 0, rejected: [] });

        const session = await signIn(auth, 'igor', 'kivo-pass-1');
        const user = session?.user as { id: string; email: string; displayUsername?: string };
        expect(user.id).toBe(KIVO_ID);
        expect(user.displayUsername).toBe('Igor');
        expect(user.email).toMatch(/^[0-9a-f-]{36}@users\.invalid$/);
    });

    it('skips users that were already imported', async () => {
        const { auth, db } = makeAuth();
        const users = [await kivoUser()];
        await importKivoUsers(auth, users, { apply: true });
        expect(await importKivoUsers(auth, users, { apply: true })).toEqual({ created: 0, skipped: 1, rejected: [] });
        expect(db.user).toHaveLength(1);
        expect(db.account).toHaveLength(1);
    });

    it('writes nothing on a dry run but reports what it would create', async () => {
        const { auth, db } = makeAuth();
        expect(await importKivoUsers(auth, [await kivoUser()], { apply: false })).toEqual({
            created: 1,
            skipped: 0,
            rejected: [],
        });
        expect(db.user).toHaveLength(0);
        expect(db.account).toHaveLength(0);
    });

    it('imports legacy bcrypt hashes that still verify', async () => {
        const { auth } = makeAuth();
        const passwordHash = await Bun.password.hash('kivo-pass-1', { algorithm: 'bcrypt', cost: 4 });
        await importKivoUsers(auth, [await kivoUser({ passwordHash })], { apply: true });
        expect((await signIn(auth, 'Igor', 'kivo-pass-1'))?.user.id).toBe(KIVO_ID);
    });

    it('rejects users who could never sign in, without writing them', async () => {
        const { auth, db } = makeAuth();
        const result = await importKivoUsers(
            auth,
            [
                await kivoUser({ _id: 'a'.repeat(24), username: 'has space' }),
                await kivoUser({ _id: 'b'.repeat(24), username: 'x'.repeat(51) }),
                await kivoUser({ _id: 'c'.repeat(24), username: 'plain', passwordHash: 'not-a-hash' }),
            ],
            { apply: true }
        );
        expect(result.created).toBe(0);
        expect(result.rejected.map((r) => r.username)).toEqual(['has space', 'x'.repeat(51), 'plain']);
        expect(db.user).toHaveLength(0);
    });

    it('rejects a username another account already holds, case-insensitively, even on a dry run', async () => {
        for (const apply of [true, false]) {
            const { auth } = makeAuth();
            const result = await importKivoUsers(
                auth,
                [await kivoUser(), await kivoUser({ _id: 'd'.repeat(24), username: 'IGOR' })],
                { apply }
            );
            expect(result.created).toBe(1);
            expect(result.rejected).toEqual([{ username: 'IGOR', reason: 'username already taken' }]);
        }
    });
});

describe('resetPassword', () => {
    it('swaps the password and signs the user out everywhere', async () => {
        const { auth, db } = makeAuth();
        await importKivoUsers(auth, [await kivoUser()], { apply: true });
        await signIn(auth, 'igor', 'kivo-pass-1');
        expect(db.session).toHaveLength(1);

        await resetPassword(auth, 'IGOR', 'brand-new-pass');

        expect(db.session).toHaveLength(0);
        await expect(signIn(auth, 'igor', 'kivo-pass-1')).rejects.toThrow();
        expect((await signIn(auth, 'igor', 'brand-new-pass'))?.user.id).toBe(KIVO_ID);
    });

    it('refuses unknown usernames and too-short passwords', async () => {
        const { auth } = makeAuth();
        await expect(resetPassword(auth, 'ghost', 'long-enough-pass')).rejects.toThrow('No user with username ghost');
        await importKivoUsers(auth, [await kivoUser()], { apply: true });
        await expect(resetPassword(auth, 'igor', 'short')).rejects.toThrow('at least 8');
    });
});
