import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface TimeFieldProps {
    id: string;
    label: string;
    /** Raw input string — parsed to a number by the caller at submit time. */
    value: string;
    onChange: (value: string) => void;
    /** Unit suffix shown inside the field, e.g. "min". */
    suffix?: string;
    placeholder?: string;
    disabled?: boolean;
}

// Labeled numeric input with an optional unit suffix — the native number input already
// provides step up/down affordances, so this covers the "TimeField/number-stepper" need
// for prepTime/cookTime/servings without a bespoke stepper widget.
export const TimeField = ({ id, label, value, onChange, suffix, placeholder, disabled }: TimeFieldProps) => (
    <div>
        <Label htmlFor={id}>{label}</Label>
        <div className="relative mt-2">
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={`border border-foreground/30 ${suffix ? 'pr-10' : ''}`}
            />
            {suffix && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {suffix}
                </span>
            )}
        </div>
    </div>
);
