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
import { motion, type PanInfo } from 'motion/react';

export const dayKey = (date: Date): string => format(date, 'yyyy-MM-dd');

const SWIPE_THRESHOLD = 50;

// Combine drag distance with a fraction of fling velocity so a fast short flick still pages.
const resolveMonthSwipe = (offsetX: number, velocityX: number): -1 | 0 | 1 => {
    const effective = offsetX + velocityX / 8;
    if (effective < -SWIPE_THRESHOLD) return 1; // swipe left -> next month
    if (effective > SWIPE_THRESHOLD) return -1; // swipe right -> prev month
    return 0;
};

export interface DayDot {
    color: string;
    dimmed: boolean;
}

export interface MonthGridProps {
    month: Date;
    dotsByDay: Record<string, DayDot[]>; // dayKey -> dots
    selectedDay: Date | undefined;
    onSelectDay: (day: Date) => void;
    onDropTodoOnDay: (todoId: string, day: Date) => void;
    onChangeMonth?: (direction: -1 | 1) => void;
}

interface DayCellProps {
    day: Date;
    dots: DayDot[];
    selected: boolean;
    inMonth: boolean;
    onSelect: () => void;
    onDrop: (id: string) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const DayCell = ({ day, dots, selected, inMonth, onSelect, onDrop }: DayCellProps) => {
    const key = dayKey(day);
    const colorClass = inMonth ? 'text-foreground' : 'text-muted-foreground/40';
    const bgClass = selected ? 'bg-primary text-primary-foreground' : 'bg-muted/40';

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('todoId');
        if (id) onDrop(id);
    };

    return (
        <button
            type="button"
            key={key}
            data-testid={`day-${key}`}
            onClick={onSelect}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative ${colorClass} ${bgClass}`}
        >
            <span>{day.getDate()}</span>
            {dots.length > 0 && (
                <span className="flex gap-0.5 mt-0.5">
                    {dots.slice(0, 3).map((dot, i) => (
                        <span
                            key={`${key}-dot-${i}-${dot.color}`}
                            data-testid="day-dot"
                            data-dimmed={dot.dimmed}
                            className={`h-1.5 w-1.5 rounded-full ${dot.dimmed ? 'opacity-30' : ''}`}
                            style={{ backgroundColor: selected ? '#fff' : dot.color }}
                        />
                    ))}
                </span>
            )}
        </button>
    );
};

export const MonthGrid = ({
    month,
    dotsByDay,
    selectedDay,
    onSelectDay,
    onDropTodoOnDay,
    onChangeMonth,
}: MonthGridProps) => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const handleDragEnd = (_e: unknown, info: PanInfo) => {
        const direction = resolveMonthSwipe(info.offset.x, info.velocity.x);
        if (direction !== 0) onChangeMonth?.(direction);
    };

    return (
        <div>
            <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d, i) => (
                    <div key={`weekday-${i}-${d}`} className="text-center text-xs text-muted-foreground">
                        {d}
                    </div>
                ))}
            </div>
            <motion.div
                key={format(month, 'yyyy-MM')}
                drag={onChangeMonth ? 'x' : false}
                dragSnapToOrigin
                dragElastic={0.2}
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-7 gap-1 touch-pan-y"
            >
                {days.map((day) => {
                    const key = dayKey(day);
                    return (
                        <DayCell
                            key={key}
                            day={day}
                            dots={dotsByDay[key] ?? []}
                            selected={selectedDay ? isSameDay(day, selectedDay) : false}
                            inMonth={isSameMonth(day, month)}
                            onSelect={() => onSelectDay(day)}
                            onDrop={(id) => onDropTodoOnDay(id, day)}
                        />
                    );
                })}
            </motion.div>
        </div>
    );
};
