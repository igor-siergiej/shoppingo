import type { Label } from '@shoppingo/types';
import { format } from 'date-fns';
import { type DayTodoItem, DayTodoList } from '../../components/Calendar/DayTodoList';
import { WeekAgenda } from '../../components/Calendar/WeekAgenda';
import type { AgendaDay } from '../../utils/calendar';
import type { CalendarView } from './CalendarHeader';

export interface CalendarBodyProps {
    view: CalendarView;
    selectedDay: Date;
    selectedItems: DayTodoItem[];
    weekDays: AgendaDay[];
    labels: Label[];
    onToggle: (todoId: string, occurrenceDay: string) => void;
    onDelete: (todoId: string) => void;
    schedulingTodoId: string | null;
    onScheduleDay: (day: Date) => void;
}

export const CalendarBody = ({
    view,
    selectedDay,
    selectedItems,
    weekDays,
    labels,
    onToggle,
    onDelete,
    schedulingTodoId,
    onScheduleDay,
}: CalendarBodyProps) => (
    <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'month' ? (
            <div className="mt-3">
                <h3 className="text-sm font-medium text-muted-foreground">{format(selectedDay, 'EEE d MMMM')}</h3>
                <DayTodoList items={selectedItems} labels={labels} onToggle={onToggle} onDelete={onDelete} />
            </div>
        ) : (
            <div className="mt-3">
                <WeekAgenda
                    days={weekDays}
                    labels={labels}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    schedulingTodoId={schedulingTodoId}
                    onScheduleDay={onScheduleDay}
                />
            </div>
        )}
    </div>
);
