import type React from 'react';
import { forwardRef } from 'react';

interface ToolBarButtonProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive';
}

export const ToolBarButton = forwardRef<HTMLButtonElement, ToolBarButtonProps>(
    ({ icon: Icon, title, onClick, disabled = false, variant = 'default' }, ref) => {
        const isDestructive = variant === 'destructive';

        return (
            <button
                ref={ref}
                type="button"
                className={`h-12 w-12 rounded-full transition-colors flex items-center justify-center ${
                    isDestructive ? 'text-destructive hover:bg-destructive/10' : 'hover:bg-gray-500/10'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={title}
                onClick={onClick}
                disabled={disabled}
            >
                <Icon className="size-5" />
            </button>
        );
    }
);

ToolBarButton.displayName = 'ToolBarButton';
