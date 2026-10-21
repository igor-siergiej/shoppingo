// Better Auth answers failed sign-ins and sign-ups with `{ code, message, status }`; these are the
// ones a person can act on, in the app's own words.
const MESSAGES: Record<string, string> = {
    INVALID_USERNAME_OR_PASSWORD: 'Invalid username or password',
    USERNAME_IS_ALREADY_TAKEN: 'That username is taken',
    USERNAME_TOO_SHORT: 'Username must be at least 3 characters',
    USERNAME_TOO_LONG: 'Username must not exceed 50 characters',
    INVALID_USERNAME: 'Usernames may only use letters, numbers, _ and .',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
};

export interface AuthClientError {
    code?: string;
    message?: string;
    status?: number;
}

// Rate limit first, then a known code, then the server's own words, then the caller's fallback.
// fallow-ignore-next-line complexity
export const authErrorMessage = (error: AuthClientError, fallback: string): string => {
    if (error.status === 429) return 'Too many attempts. Wait a minute and try again.';
    return (error.code && MESSAGES[error.code]) || error.message || fallback;
};
