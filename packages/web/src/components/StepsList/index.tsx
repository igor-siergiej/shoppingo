interface StepsListProps {
    steps: string[];
    onChange: (steps: string[]) => void;
    disabled?: boolean;
}

export const StepsList = ({ steps, onChange, disabled }: StepsListProps) => (
    <div className="space-y-1">
        {steps.map((step, i) => (
            <div
                key={`${i}-${step.slice(0, 20)}`}
                className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm"
            >
                <span className="font-semibold text-muted-foreground min-w-[1.25rem]">{i + 1}.</span>
                <span className="flex-1 text-foreground">{step}</span>
                <button
                    type="button"
                    onClick={() => onChange(steps.filter((_, idx) => idx !== i))}
                    disabled={disabled}
                    className="text-destructive hover:opacity-70"
                    aria-label={`Remove step ${i + 1}`}
                >
                    ×
                </button>
            </div>
        ))}
        <button
            type="button"
            onClick={() => onChange([...steps, ''])}
            disabled={disabled}
            className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-md py-1.5 hover:bg-muted/50 transition-colors"
        >
            + Add step
        </button>
    </div>
);
