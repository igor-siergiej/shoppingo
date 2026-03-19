import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, useAuthConfig } from '@imapps/web-utils';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { logger } from '../utils/logger';

const registerSchema = z
    .object({
        username: z
            .string()
            .min(1, 'Username is required')
            .min(3, 'Username must be at least 3 characters')
            .max(50, 'Username must not exceed 50 characters')
            .trim(),
        password: z
            .string()
            .min(1, 'Password is required')
            .min(6, 'Password must be at least 6 characters')
            .max(100, 'Password must not exceed 100 characters'),
        repeatPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.repeatPassword, {
        message: 'Passwords do not match',
        path: ['repeatPassword'],
    });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const useRegisterForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const config = useAuthConfig();

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
                throw new Error(errorData.error || 'Registration failed');
            }

            const responseData = await response.json();
            login(responseData.accessToken);
            logger.info('Registration successful', { username: data.username });

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
