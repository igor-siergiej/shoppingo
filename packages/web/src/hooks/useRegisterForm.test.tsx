import { describe, expect, it } from 'vitest';
import { parseRegisterError, registerSchema } from './useRegisterForm';

describe('registerSchema', () => {
    describe('password', () => {
        const base = { username: 'alice', repeatPassword: 'whatever' };

        it('accepts a password with ≥8 chars, alphanumeric, with letter+digit', () => {
            const result = registerSchema.safeParse({ ...base, password: 'passw0rd', repeatPassword: 'passw0rd' });
            expect(result.success).toBe(true);
        });

        it('rejects a password shorter than 8 characters', () => {
            const result = registerSchema.safeParse({ ...base, password: 'abc12', repeatPassword: 'abc12' });
            expect(result.success).toBe(false);
            if (!result.success) {
                const passwordIssue = result.error.issues.find((i) => i.path[0] === 'password');
                expect(passwordIssue?.message).toMatch(/at least 8 characters/i);
            }
        });

        it('rejects a password with no digits', () => {
            const result = registerSchema.safeParse({ ...base, password: 'abcdefgh', repeatPassword: 'abcdefgh' });
            expect(result.success).toBe(false);
        });

        it('rejects a password with no letters', () => {
            const result = registerSchema.safeParse({ ...base, password: '12345678', repeatPassword: '12345678' });
            expect(result.success).toBe(false);
        });

        it('rejects a password containing special characters', () => {
            const result = registerSchema.safeParse({
                ...base,
                password: 'abcd1234!',
                repeatPassword: 'abcd1234!',
            });
            expect(result.success).toBe(false);
        });

        it('rejects an empty password with the required-field message', () => {
            const result = registerSchema.safeParse({ ...base, password: '', repeatPassword: '' });
            expect(result.success).toBe(false);
            if (!result.success) {
                const passwordIssue = result.error.issues.find((i) => i.path[0] === 'password');
                expect(passwordIssue?.message).toBe('Password is required');
            }
        });
    });

    describe('repeatPassword', () => {
        const base = { username: 'alice' };

        it('rejects when repeatPassword does not match password', () => {
            const result = registerSchema.safeParse({
                ...base,
                password: 'passw0rd',
                repeatPassword: 'passw0rdX',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                const issue = result.error.issues.find((i) => i.path[0] === 'repeatPassword');
                expect(issue?.message).toBe('Passwords do not match');
            }
        });

        it('accepts when both passwords are matching and password is valid', () => {
            const result = registerSchema.safeParse({
                ...base,
                password: 'passw0rd',
                repeatPassword: 'passw0rd',
            });
            expect(result.success).toBe(true);
        });

        it('rejects with "Please confirm your password" when repeatPassword is empty', () => {
            const result = registerSchema.safeParse({
                ...base,
                password: 'passw0rd',
                repeatPassword: '',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                const issue = result.error.issues.find((i) => i.path[0] === 'repeatPassword');
                expect(issue?.message).toBe('Please confirm your password');
            }
        });
    });

    describe('username', () => {
        const valid = { password: 'passw0rd', repeatPassword: 'passw0rd' };

        it('rejects an empty username with the required-field message', () => {
            const result = registerSchema.safeParse({ ...valid, username: '' });
            expect(result.success).toBe(false);
        });

        it('rejects a username shorter than 3 characters', () => {
            const result = registerSchema.safeParse({ ...valid, username: 'ab' });
            expect(result.success).toBe(false);
        });

        it('trims whitespace from the username before validation', () => {
            const result = registerSchema.safeParse({ ...valid, username: '  alice  ' });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.username).toBe('alice');
            }
        });
    });
});

describe('parseRegisterError', () => {
    it('returns the server `message` field when present', () => {
        expect(parseRegisterError({ success: false, message: 'Password too weak' })).toBe('Password too weak');
        expect(parseRegisterError({ success: false, message: 'This username is already taken' })).toBe(
            'This username is already taken'
        );
    });

    it('falls back to the legacy `error` field when `message` is missing', () => {
        expect(parseRegisterError({ error: 'legacy server said no' })).toBe('legacy server said no');
    });

    it('prefers `message` over `error` when both are present', () => {
        expect(parseRegisterError({ message: 'new', error: 'old' })).toBe('new');
    });

    it('falls back to "Registration failed" when neither field is present', () => {
        expect(parseRegisterError({})).toBe('Registration failed');
        expect(parseRegisterError({ success: false })).toBe('Registration failed');
    });
});
