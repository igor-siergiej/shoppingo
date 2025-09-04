import * as React from 'react';

import { cn } from '@/lib/utils';

function Alert({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            role="alert"
            className={cn(
                'w-full rounded-md border p-3 text-sm shadow-sm bg-background border-border',
                className
            )}
            {...props}
        />
    );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn('mb-1 font-medium leading-none tracking-tight', className)}
            {...props}
        />
    );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn('text-sm opacity-90', className)}
            {...props}
        />
    );
}

export { Alert, AlertDescription, AlertTitle };
