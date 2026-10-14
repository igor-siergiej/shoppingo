import { isoDay, type Label as LabelType, type Recurrence, type Todo } from '@shoppingo/types';
import { useId, useState } from 'react';
import type { UpdateTodoBody } from '../../../api';
import { DueDateField } from '../../DueDateField';
import { LabelSelect } from '../../LabelSelect';
import { RecurrenceField } from '../../RecurrenceField';
import { TodoTimeField } from '../../TodoTimeField';
import { Button } from '../../ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '../../ui/drawer';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

export interface EditTodoDrawerProps {
    todo: Todo | null;
    labels: LabelType[];
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, body: UpdateTodoBody) => Promise<unknown> | undefined;
}

const parseDay = (day: string): Date => {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date);
};

interface EditValues {
    title: string;
    dueDate?: Date;
    time?: string;
    labelId?: string;
    recurrence?: Recurrence;
}

export const buildUpdateBody = (
    todo: Todo,
    { title, dueDate, time, labelId, recurrence }: EditValues
): UpdateTodoBody => {
    const body: UpdateTodoBody = { title };
    const clear: NonNullable<UpdateTodoBody['clear']> = [];

    if (dueDate) body.dueDate = isoDay(dueDate);
    else if (todo.dueDate) clear.push('dueDate');

    if (time) body.time = time;
    else if (todo.time) clear.push('time');

    if (labelId) body.labelId = labelId;
    else if (todo.labelId) clear.push('labelId');

    if (recurrence) body.recurrence = recurrence;
    else if (todo.recurrence) clear.push('recurrence');

    if (clear.length > 0) body.clear = clear;
    return body;
};

interface EditTodoFormProps extends Omit<EditTodoDrawerProps, 'todo' | 'onOpenChange'> {
    todo: Todo;
    onDone: () => void;
}

const EditTodoForm = ({ todo, labels, onSave, onDone }: EditTodoFormProps) => {
    const titleId = useId();
    const [title, setTitle] = useState(todo.title);
    const [dueDate, setDueDate] = useState<Date | undefined>(todo.dueDate ? parseDay(todo.dueDate) : undefined);
    const [time, setTime] = useState<string | undefined>(todo.time);
    const [labelId, setLabelId] = useState<string | undefined>(todo.labelId);
    const [recurrence, setRecurrence] = useState<Recurrence | undefined>(todo.recurrence);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const trimmed = title.trim();
        if (!trimmed) {
            setError('Title is required');
            return;
        }
        await onSave(todo.id, buildUpdateBody(todo, { title: trimmed, dueDate, time, labelId, recurrence }));
        onDone();
    };

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col sm:mx-auto sm:max-w-[400px]">
            <DrawerHeader className="flex-none">
                <DrawerTitle>Edit Todo</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4 pb-0 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={titleId}>Title</Label>
                    <Input
                        id={titleId}
                        value={title}
                        purpose="name"
                        className={`${error ? 'border-destructive' : ''} h-12 text-base`}
                        onChange={(e) => {
                            setError('');
                            setTitle(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleSave();
                        }}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DueDateField value={dueDate} onChange={setDueDate} captionLayout="dropdown" />
                <TodoTimeField value={time} onChange={setTime} />
                <LabelSelect labels={labels} value={labelId} onChange={setLabelId} />
                <RecurrenceField value={recurrence} onChange={setRecurrence} />
            </div>
            <DrawerFooter className="flex-none">
                <Button onClick={handleSave}>Save</Button>
                <DrawerClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DrawerClose>
            </DrawerFooter>
        </div>
    );
};

export const EditTodoDrawer = ({ todo, labels, onOpenChange, onSave }: EditTodoDrawerProps) => (
    <Drawer open={todo !== null} onOpenChange={onOpenChange}>
        <DrawerContent>
            {todo && (
                <EditTodoForm
                    key={todo.id}
                    todo={todo}
                    labels={labels}
                    onSave={onSave}
                    onDone={() => onOpenChange(false)}
                />
            )}
        </DrawerContent>
    </Drawer>
);
