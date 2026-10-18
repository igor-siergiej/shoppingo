import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, useAuthConfig } from '@imapps/web-utils';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useMigration } from '../guest/useMigration';
import { logger } from '../utils/logger';
import { usernameField } from './authSchemas';

const loginSchema = z.object({
    username: usernameField,
    password: z
        .string()
        .min(1, 'Password is required')
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must not exceed 100 characters'),
});

interface ReturnLocation {
    pathname?: string;
    search?: string;
    hash?: string;
}

const redirectTarget = ({ pathname, search = '', hash = '' }: ReturnLocation = {}): string =>
    pathname ? `${pathname}${search}${hash}` : '/';

type LoginFormData = z.infer<typeof loginSchema>;

export const useLoginForm = () => {
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
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    // fallow-ignore-next-line complexity
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

            const accessToken = responseData.token || responseData.accessToken;
            login(accessToken);

            // Upload any guest lists before navigating so the account lands with them.
            await migrateAfterAuth(accessToken);

            logger.info('Login successful', { username: data.username });

            navigate(redirectTarget(location.state?.from), { replace: true });
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
