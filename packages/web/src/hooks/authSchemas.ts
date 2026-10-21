import { z } from 'zod';

// Same characters Better Auth's username plugin accepts by default (its built-in validator), so the
// form rejects a name before the server answers 422 INVALID_USERNAME.
const USERNAME_CHARACTERS = /^[a-zA-Z0-9_.]+$/;

export const usernameField = z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .trim()
    .regex(USERNAME_CHARACTERS, 'Use only letters, numbers, underscores and dots');
