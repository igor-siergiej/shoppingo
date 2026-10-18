import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, useAuthConfig } from '@imapps/web-utils';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useMigration } from '../guest/useMigration';
import { track } from '../utils/analytics';
import { logger } from '../utils/logger';
import { usernameField } from './authSchemas';

const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
const passwordMessage = 'At least 8 characters, letters and digits only, must include both letters and a number';

export const registerSchema = z
    .object({
        username: usernameField,
        password: z
            .string()
            .min(1, 'Password is required')
            .regex(passwordRule, passwordMessage)
            .max(100, 'Password must not exceed 100 characters'),
        repeatPassword: z
            .string()
            .min(1, 'Please confirm your password')
            .max(100, 'Password must not exceed 100 characters'),
    })
    .refine((data) => data.password === data.repeatPassword, {
        message: 'Passwords do not match',
        path: ['repeatPassword'],
    });

export const parseRegisterError = (errorData: { message?: string; error?: string }): string =>
    errorData.message || errorData.error || 'Registration failed';

type RegisterFormData = z.infer<typeof registerSchema>;

export const useRegisterForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const config = useAuthConfig();
    const { migrateAfterAuth } = useMigration();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        logger.info('Registration attempt', { username: data.username });

        try {
            const response = await fetch(`${config.authUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username: data.username, password: data.password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                // kivo returns { success: false, message: '<reason>' } — read `message` first
                // (the legacy `error` key may also be present, fall back to it for compatibility).
                throw new Error(parseRegisterError(errorData));
            }

            const responseData = await response.json();
            const accessToken = responseData.accessToken;
            login(accessToken);
            track('sign_up_completed', { username: data.username });
            logger.info('Registration successful', { username: data.username });

            // The most common path here is a guest who just clicked "Sign up to
            // save" from the banner. Migrate before they navigate so the new
            // account lands with their lists already populated.
            await migrateAfterAuth(accessToken);

            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            logger.warn('Registration failed', { username: data.username, error: errorMessage });
            setError('root', { message: errorMessage });
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
    };
};
