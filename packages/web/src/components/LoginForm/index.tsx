import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useGuest } from '../../guest/GuestContext';
import { useLoginForm } from '../../hooks/useLoginForm';
import { LoginFormFields } from './LoginFormFields';

export const LoginForm: React.FC = () => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } = useLoginForm();
    const { enterGuestMode } = useGuest();
    const navigate = useNavigate();

    const handleTryIt = () => {
        enterGuestMode();
        navigate('/');
    };

    return (
        <div className="flex flex-col gap-6">
            <Card className="pt-4">
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>Enter your username below to login to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            <LoginFormFields register={register} errors={errors} isSubmitting={isSubmitting} />

                            {errors.root && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    {errors.root.message}
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? 'Logging in...' : 'Login'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={handleTryIt}
                                    data-testid="try-it-button"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Try it without an account
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
