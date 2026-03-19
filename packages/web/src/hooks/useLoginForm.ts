import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, useAuthConfig } from '@imapps/web-utils';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { logger } from '../utils/logger';

const loginSchema = z.object({
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
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const useLoginForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const config = useAuthConfig();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        logger.info('Login attempt', { username: data.username });
        try {
            const response = await fetch(`${config.authUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }

            const responseData = await response.json();

            if (!responseData.token && !responseData.accessToken) {
                logger.error('No token found in response from login endpoint');
                throw new Error('Login successful but no token received');
            }

            login(responseData.token || responseData.accessToken);
            logger.info('Login successful', { username: data.username });

            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            logger.warn('Login failed', { username: data.username, error: errorMessage });
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
