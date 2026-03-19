import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoginForm } from '@/hooks/useLoginForm';
import { LoginFormFields } from './LoginFormFields';

export const LoginForm: React.FC = () => {
    const { register, handleSubmit, errors, isSubmitting, onSubmit } = useLoginForm();

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
                            <LoginFormFields
                                register={register}
                                errors={errors}
                                isSubmitting={isSubmitting}
                            />

                            {errors.root && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    {(errors.root as any).message}
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
