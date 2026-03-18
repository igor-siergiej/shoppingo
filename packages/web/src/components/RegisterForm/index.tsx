import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, useAuthConfig } from '@imapps/web-utils';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { logger } from '../../utils/logger';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

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

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm({ className, ...props }: React.ComponentProps<'div'>) {
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

    return (
        <div className={`flex flex-col gap-6 ${className ?? ''}`} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Create your account</CardTitle>
                    <CardDescription>Enter your details below to create your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-3">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    {...register('username')}
                                    aria-invalid={errors.username ? 'true' : 'false'}
                                />
                                {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    {...register('password')}
                                    aria-invalid={errors.password ? 'true' : 'false'}
                                />
                                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="repeatPassword">Repeat Password</Label>
                                <Input
                                    id="repeatPassword"
                                    type="password"
                                    placeholder="Repeat your password"
                                    {...register('repeatPassword')}
                                    aria-invalid={errors.repeatPassword ? 'true' : 'false'}
                                />
                                {errors.repeatPassword && (
                                    <p className="text-sm text-red-600">{errors.repeatPassword.message}</p>
                                )}
                            </div>
                            {errors.root && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    {errors.root.message}
                                </div>
                            )}
                            <div className="flex flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Already have an account?{' '}
                            <a href="/login" className="underline underline-offset-4">
                                Sign in
                            </a>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
