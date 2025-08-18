import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function RegisterForm({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [validationError, setValidationError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');
        setError(null);

        // Validate passwords match
        if (password !== repeatPassword) {
            setValidationError('Passwords do not match');

            return;
        }

        // Validate password length
        if (password.length < 6) {
            setValidationError('Password must be at least 6 characters long');

            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_AUTH_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();

                throw new Error(errorData.error || 'Registration failed');
            }

            const data = await response.json();

            login(data.token);

            // Redirect to the page they were trying to access, or home
            const from = location.state?.from?.pathname || '/';

            navigate(from, { replace: true });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Create your account</CardTitle>
                    <CardDescription>
                        Enter your details below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-3">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="repeatPassword">Repeat Password</Label>
                                <Input
                                    id="repeatPassword"
                                    type="password"
                                    placeholder="Repeat your password"
                                    value={repeatPassword}
                                    onChange={e => setRepeatPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {(validationError || error) && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    {validationError || error}
                                </div>
                            )}
                            <div className="flex flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Already have an account?
                            {' '}
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
