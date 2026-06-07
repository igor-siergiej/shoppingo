import type { Label } from '@shoppingo/types';
import { format } from 'date-fns';
import type { AgendaDay } from '../../../utils/calendar';
import { DayTodoList } from '../DayTodoList';

export interface WeekAgendaProps {
    days: AgendaDay[];
    labels: Label[];
    onToggle: (todoId: string, occurrenceDay: string) => void;
    onDelete: (todoId: string) => void;
}

export const WeekAgenda = ({ days, labels, onToggle, onDelete }: WeekAgendaProps) => {
    const withItems = days.filter((d) => d.items.length > 0);

    if (withItems.length === 0) {
        return <p className="text-sm text-muted-foreground py-6 text-center">No upcoming todos this week</p>;
    }

    return (
        <div className="space-y-3 pb-44">
            {withItems.map(({ day, items }) => (
                <div key={day.toISOString()}>
                    <h3 className="text-sm font-medium text-muted-foreground">{format(day, 'EEE d MMM')}</h3>
                    <DayTodoList items={items} labels={labels} onToggle={onToggle} onDelete={onDelete} />
                </div>
            ))}
        </div>
    );
};
