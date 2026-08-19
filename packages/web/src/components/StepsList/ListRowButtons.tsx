interface RemoveRowButtonProps {
    onClick: () => void;
    disabled?: boolean;
    ariaLabel: string;
}

export const RemoveRowButton = ({ onClick, disabled, ariaLabel }: RemoveRowButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="text-destructive hover:opacity-70"
        aria-label={ariaLabel}
    >
        ×
    </button>
);

interface AddRowButtonProps {
    onClick: () => void;
    disabled?: boolean;
    label: string;
}

export const AddRowButton = ({ onClick, disabled, label }: AddRowButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-md py-1.5 hover:bg-muted/50 transition-colors"
    >
        {label}
    </button>
);
