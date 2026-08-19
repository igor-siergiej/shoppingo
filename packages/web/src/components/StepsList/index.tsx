import { AddRowButton, RemoveRowButton } from './ListRowButtons';

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
                <RemoveRowButton
                    onClick={() => onChange(steps.filter((_, idx) => idx !== i))}
                    disabled={disabled}
                    ariaLabel={`Remove step ${i + 1}`}
                />
            </div>
        ))}
        <AddRowButton onClick={() => onChange([...steps, ''])} disabled={disabled} label="+ Add step" />
    </div>
);
