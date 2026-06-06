import { useId } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface TimeFieldProps {
    value: string | undefined; // 'HH:mm'
    onChange: (value: string | undefined) => void;
}

export const TimeField = ({ value, onChange }: TimeFieldProps) => {
    const id = useId();
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>Time (Optional)</Label>
            <Input
                id={id}
                type="time"
                className="h-12 text-base"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value || undefined)}
            />
        </div>
    );
};
