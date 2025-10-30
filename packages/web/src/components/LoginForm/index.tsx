import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, useAuthConfig } from '@imapps/web-utils';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

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

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
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
                console.error('No token found in response:', responseData);
                throw new Error('Login successful but no token received');
            }

            login(responseData.token || responseData.accessToken);

            const from = location.state?.from?.pathname || '/';

            navigate(from, { replace: true });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';

            setError('root', { message: errorMessage });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>Enter your username below to login to your account</CardDescription>
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
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    {...register('password')}
                                    aria-invalid={errors.password ? 'true' : 'false'}
                                />
                                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                            </div>
                            {errors.root && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    {errors.root.message}
                                </div>
                            )}
                            <div className="flex flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? 'Logging in...' : 'Login'}
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Don't have an account?{' '}
                            <a href="/register" className="underline underline-offset-4">
                                Sign up
                            </a>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
