import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CreateTodoBody } from '../../api';
import { type DayTodoItem, DayTodoList } from '../../components/Calendar/DayTodoList';
import { InboxDrawer } from '../../components/Calendar/InboxDrawer';
import { LabelFilter } from '../../components/Calendar/LabelFilter';
import { dayKey, MonthGrid } from '../../components/Calendar/MonthGrid';
import ToolBar from '../../components/ToolBar';
import { Button } from '../../components/ui/button';
import { useLabels } from '../../hooks/useLabels';
import { useTodos } from '../../hooks/useTodos';
import { expandOccurrences, isoDay } from '../../utils/recurrence';

const CalendarPage = () => {
    const { todos, createTodo, updateTodo, completeTodo } = useTodos();
    const { labels } = useLabels();

    const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());

    const labelColor = useMemo(() => {
        const map = new Map<string, string>();
        for (const l of labels) map.set(l.id, l.color);
        return map;
    }, [labels]);

    const visible = useMemo(
        () => (activeLabels.size === 0 ? todos : todos.filter((t) => t.labelId && activeLabels.has(t.labelId))),
        [todos, activeLabels]
    );

    const { dotsByDay, selectedItems } = useMemo(() => {
        const rangeStart = startOfMonth(month);
        const rangeEnd = endOfMonth(month);
        const dots: Record<string, string[]> = {};
        const items: DayTodoItem[] = [];
        const selectedKey = dayKey(selectedDay);

        for (const todo of visible) {
            const color = todo.labelId ? labelColor.get(todo.labelId) : undefined;
            for (const occ of expandOccurrences(todo, rangeStart, rangeEnd)) {
                const key = dayKey(occ.date);
                if (!dots[key]) dots[key] = [];
                dots[key].push(color ?? '#3b82f6');
                if (key === selectedKey) {
                    items.push({
                        todoId: todo.id,
                        title: todo.title,
                        time: todo.time,
                        done: occ.done,
                        labelColor: color,
                        occurrenceDay: isoDay(occ.date),
                    });
                }
            }
        }
        return { dotsByDay: dots, selectedItems: items };
    }, [visible, month, selectedDay, labelColor]);

    const undated = useMemo(() => todos.filter((t) => !t.dueDate), [todos]);

    const handleAddTodo = async (body: CreateTodoBody) => {
        await createTodo(body);
    };

    const handleDropOnDay = (todoId: string, day: Date) => {
        void updateTodo(todoId, { dueDate: day });
    };

    const handleToggle = (todoId: string, occurrenceDay: string) => {
        const todo = todos.find((t) => t.id === todoId);
        void completeTodo(todoId, todo?.recurrence ? occurrenceDay : undefined);
    };

    const toggleLabel = (labelId: string) =>
        setActiveLabels((prev) => {
            const next = new Set(prev);
            if (next.has(labelId)) next.delete(labelId);
            else next.add(labelId);
            return next;
        });

    return (
        <>
            <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-lg font-semibold">{format(month, 'MMMM yyyy')}</h2>
                    <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                <LabelFilter labels={labels} active={activeLabels} onToggle={toggleLabel} />

                <MonthGrid
                    month={month}
                    dotsByDay={dotsByDay}
                    selectedDay={selectedDay}
                    onSelectDay={setSelectedDay}
                    onDropTodoOnDay={handleDropOnDay}
                />

                <div className="mt-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{format(selectedDay, 'EEE d MMMM')}</h3>
                    <DayTodoList items={selectedItems} labels={labels} onToggle={handleToggle} />
                </div>
            </div>

            <InboxDrawer todos={undated} />

            <ToolBar onAddTodo={handleAddTodo} labels={labels} prefillTodoDate={selectedDay} />
        </>
    );
};

export default CalendarPage;
