import type { Label as LabelType, Recurrence } from '@shoppingo/types';
import { Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { CreateTodoBody } from '../../../api';
import { DueDateField } from '../../../components/DueDateField';
import { LabelSelect } from '../../../components/LabelSelect';
import { RecurrenceField } from '../../../components/RecurrenceField';
import { TimeField } from '../../../components/TimeField';
import { Button } from '../../../components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '../../../components/ui/drawer';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { RippleButton } from '../../../components/ui/ripple';

export interface AddTodoDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (body: CreateTodoBody) => Promise<void>;
    labels: LabelType[];
    prefillDate?: Date;
}

export const AddTodoDrawer = ({ open, onOpenChange, onAdd, labels, prefillDate }: AddTodoDrawerProps) => {
    const titleId = useId();
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState<Date | undefined>(prefillDate);
    const [time, setTime] = useState<string | undefined>(undefined);
    const [labelId, setLabelId] = useState<string | undefined>(undefined);
    const [recurrence, setRecurrence] = useState<Recurrence | undefined>(undefined);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) setDueDate(prefillDate);
    }, [open, prefillDate]);

    const reset = () => {
        setTitle('');
        setDueDate(prefillDate);
        setTime(undefined);
        setLabelId(undefined);
        setRecurrence(undefined);
        setError('');
    };

    const handleSubmit = async () => {
        const trimmed = title.trim();
        if (!trimmed) {
            setError('Title is required');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await onAdd({
                title: trimmed,
                ...(dueDate !== undefined && { dueDate }),
                ...(time !== undefined && { time }),
                ...(labelId !== undefined && { labelId }),
                ...(recurrence !== undefined && { recurrence }),
            });
            reset();
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add todo');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        reset();
        onOpenChange(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                <RippleButton
                    size="icon"
                    data-testid="add-todo-trigger"
                    className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 transition-colors"
                >
                    <Plus className="size-5" />
                </RippleButton>
            </DrawerTrigger>
            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>Add Todo</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-0 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor={titleId}>Title</Label>
                            <Input
                                id={titleId}
                                value={title}
                                autoComplete="off"
                                autoFocus
                                className={`${error ? 'border-destructive' : ''} h-12 text-base`}
                                onChange={(e) => {
                                    setError('');
                                    setTitle(e.target.value);
                                }}
                                placeholder="Enter todo title..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleSubmit();
                                    else if (e.key === 'Escape') handleCancel();
                                }}
                            />
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                        <DueDateField value={dueDate} onChange={setDueDate} captionLayout="dropdown" />
                        <TimeField value={time} onChange={setTime} />
                        <LabelSelect labels={labels} value={labelId} onChange={setLabelId} />
                        <RecurrenceField value={recurrence} onChange={setRecurrence} />
                    </div>
                    <DrawerFooter>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            Add Todo
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
