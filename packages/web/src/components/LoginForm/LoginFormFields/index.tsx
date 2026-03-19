import { useId } from 'react';
import { UseFormRegister, FieldValues, FieldPath, FieldError } from 'react-hook-form';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface LoginFormFieldsProps<T extends FieldValues> {
    register: UseFormRegister<T>;
    errors: Partial<Record<FieldPath<T>, FieldError | undefined>>;
    isSubmitting: boolean;
}

export const LoginFormFields = <T extends FieldValues>({
    register,
    errors,
    isSubmitting,
}: LoginFormFieldsProps<T>) => {
    const usernameId = useId();
    const passwordId = useId();

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-3">
                <Label htmlFor={usernameId}>Username</Label>
                <Input
                    id={usernameId}
                    type="text"
                    placeholder="Enter your username"
                    {...register('username' as any)}
                    aria-invalid={errors.username ? 'true' : 'false'}
                    disabled={isSubmitting}
                />
                {errors.username && <p className="text-sm text-red-600">{(errors.username as any).message}</p>}
            </div>

            <div className="grid gap-3">
                <div className="flex items-center">
                    <Label htmlFor={passwordId}>Password</Label>
                </div>
                <Input
                    id={passwordId}
                    type="password"
                    placeholder="Enter your password"
                    {...register('password' as any)}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    disabled={isSubmitting}
                />
                {errors.password && <p className="text-sm text-red-600">{(errors.password as any).message}</p>}
            </div>
        </div>
    );
};
