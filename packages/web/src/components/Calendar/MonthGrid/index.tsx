import {
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
} from 'date-fns';

export const dayKey = (date: Date): string => format(date, 'yyyy-MM-dd');

export interface MonthGridProps {
    month: Date;
    dotsByDay: Record<string, string[]>; // dayKey -> array of hex colours
    selectedDay: Date | undefined;
    onSelectDay: (day: Date) => void;
    onDropTodoOnDay: (todoId: string, day: Date) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const MonthGrid = ({ month, dotsByDay, selectedDay, onSelectDay, onDropTodoOnDay }: MonthGridProps) => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    return (
        <div>
            <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d, i) => (
                    <div key={`weekday-${i}-${d}`} className="text-center text-xs text-muted-foreground">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const key = dayKey(day);
                    const dots = dotsByDay[key] ?? [];
                    const inMonth = isSameMonth(day, month);
                    const selected = selectedDay ? isSameDay(day, selectedDay) : false;
                    return (
                        <button
                            type="button"
                            key={key}
                            onClick={() => onSelectDay(day)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const id = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('todoId');
                                if (id) onDropTodoOnDay(id, day);
                            }}
                            className={[
                                'aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative',
                                inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                                selected ? 'bg-primary text-primary-foreground' : 'bg-muted/40',
                            ].join(' ')}
                        >
                            <span>{day.getDate()}</span>
                            {dots.length > 0 && (
                                <span className="flex gap-0.5 mt-0.5">
                                    {dots.slice(0, 3).map((color, i) => (
                                        <span
                                            key={`${key}-dot-${i}-${color}`}
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ backgroundColor: selected ? '#fff' : color }}
                                        />
                                    ))}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
