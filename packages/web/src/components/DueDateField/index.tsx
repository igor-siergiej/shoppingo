import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DueDateFieldProps {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
    captionLayout?: 'dropdown' | 'label';
}

export const DueDateField = ({ value, onChange, captionLayout }: DueDateFieldProps) => {
    return (
        <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        data-empty={!value}
                        className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal h-10"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? format(value, 'dd/MM/yyyy') : 'Pick a date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-fit overflow-visible p-4 max-w-xs" align="start" side="top" sideOffset={4}>
                    <div style={{ '--cell-size': '3.5rem' } as React.CSSProperties}>
                        <Calendar
                            mode="single"
                            selected={value}
                            onSelect={onChange}
                            {...(captionLayout && { captionLayout })}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};
