import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CreateTodoBody } from '../../api';
import { DayTodoList } from '../../components/Calendar/DayTodoList';
import { InboxDrawer } from '../../components/Calendar/InboxDrawer';
import { LabelFilter } from '../../components/Calendar/LabelFilter';
import { MonthGrid } from '../../components/Calendar/MonthGrid';
import { WeekAgenda } from '../../components/Calendar/WeekAgenda';
import ToolBar from '../../components/ToolBar';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshContext';
import { useLabels } from '../../hooks/useLabels';
import { useTodos } from '../../hooks/useTodos';
import { buildCalendarDayData, buildWeekAgenda } from '../../utils/calendar';
import { isoDay } from '../../utils/recurrence';

type CalendarView = 'month' | 'week';

const CalendarPage = () => {
    const { todos, createTodo, updateTodo, completeTodo, deleteTodo, refetch: refetchTodos } = useTodos();
    const { labels, refetch: refetchLabels } = useLabels();
    const { registerRefresh } = usePullToRefreshContext();

    const [view, setView] = useState<CalendarView>('month');
    const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());

    useEffect(
        () =>
            registerRefresh(async () => {
                await Promise.all([refetchTodos(), refetchLabels()]);
            }),
        [registerRefresh, refetchTodos, refetchLabels]
    );

    const labelColor = useMemo(() => {
        const map = new Map<string, string>();
        for (const l of labels) map.set(l.id, l.color);
        return map;
    }, [labels]);

    const { dotsByDay, selectedItems } = useMemo(
        () =>
            buildCalendarDayData(todos, month, selectedDay, startOfMonth(month), endOfMonth(month), {
                labelColor,
                activeLabels,
            }),
        [todos, month, selectedDay, labelColor, activeLabels]
    );

    const weekDays = useMemo(
        () => buildWeekAgenda(todos, new Date(), { labelColor, activeLabels }),
        [todos, labelColor, activeLabels]
    );

    const undated = useMemo(() => todos.filter((t) => !t.dueDate), [todos]);

    const handleAddTodo = async (body: CreateTodoBody) => {
        await createTodo(body);
    };
    const handleDropOnDay = (todoId: string, day: Date) => void updateTodo(todoId, { dueDate: isoDay(day) });
    const handleToggle = (todoId: string, occurrenceDay: string) => {
        const todo = todos.find((t) => t.id === todoId);
        void completeTodo(todoId, todo?.recurrence ? occurrenceDay : undefined);
    };
    const handleDelete = (todoId: string) => void deleteTodo(todoId);
    const toggleLabel = (labelId: string) =>
        setActiveLabels((prev) => {
            const next = new Set(prev);
            if (next.has(labelId)) next.delete(labelId);
            else next.add(labelId);
            return next;
        });

    return (
        <>
            <div className="flex min-h-full flex-col">
                <div className="sticky top-0 z-10 bg-background pb-2">
                    <div className="mb-2 flex items-center gap-2">
                        <Select value={view} onValueChange={(v) => setView(v as CalendarView)}>
                            <SelectTrigger className="h-9 w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">Month</SelectItem>
                                <SelectItem value="week">Week</SelectItem>
                            </SelectContent>
                        </Select>
                        {view === 'month' && (
                            <div className="flex flex-1 items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <span className="text-base font-semibold">{format(month, 'MMM yyyy')}</span>
                                <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <LabelFilter labels={labels} active={activeLabels} onToggle={toggleLabel} />

                    {view === 'month' && (
                        <MonthGrid
                            month={month}
                            dotsByDay={dotsByDay}
                            selectedDay={selectedDay}
                            onSelectDay={setSelectedDay}
                            onDropTodoOnDay={handleDropOnDay}
                            onChangeMonth={(dir) => setMonth((m) => addMonths(m, dir))}
                        />
                    )}
                </div>

                {view === 'month' ? (
                    <div className="mt-3 pb-44">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            {format(selectedDay, 'EEE d MMMM')}
                        </h3>
                        <DayTodoList
                            items={selectedItems}
                            labels={labels}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                        />
                    </div>
                ) : (
                    <div className="mt-3">
                        <WeekAgenda days={weekDays} labels={labels} onToggle={handleToggle} onDelete={handleDelete} />
                    </div>
                )}
            </div>

            <InboxDrawer todos={undated} onDelete={handleDelete} />

            <ToolBar onAddTodo={handleAddTodo} labels={labels} prefillTodoDate={selectedDay} />
        </>
    );
};

export default CalendarPage;
