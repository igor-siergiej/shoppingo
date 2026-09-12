import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import type { CreateTodoBody } from '../../api';
import { InboxDrawer } from '../../components/Calendar/InboxDrawer';
import ToolBar from '../../components/ToolBar';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshContext';
import { useLabels } from '../../hooks/useLabels';
import { useTodos } from '../../hooks/useTodos';
import { buildCalendarDayData, buildWeekAgenda } from '../../utils/calendar';
import { isoDay } from '../../utils/recurrence';
import { CalendarBody } from './CalendarBody';
import { CalendarHeader, type CalendarView } from './CalendarHeader';
import { useCalendarScheduling } from './useCalendarScheduling';

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

    const handleDropOnDay = (todoId: string, day: Date) => void updateTodo(todoId, { dueDate: isoDay(day) });
    const scheduling = useCalendarScheduling(handleDropOnDay);
    const handleSelectDay = (day: Date) => {
        scheduling.selectDay(day);
        setSelectedDay(day);
    };
    const handleAddTodo = async (body: CreateTodoBody) => {
        await createTodo(body);
    };
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
            {/*
                This page owns its own scroll instead of relying on the shared Layout's
                flex-col-reverse container: that scroll direction is reversed (built for
                chat-like lists), which interacts badly with `position: sticky` and made the
                day list unreachable behind InboxDrawer's fixed bar on tall (6-row) months —
                the header alone could exceed the viewport, and Playwright/real scrolling
                couldn't land on a spot that wasn't also covered by the sticky header or the
                Inbox bar. pb-12 on the outer box reserves room for InboxDrawer's collapsed
                height (~37px) so the day list's own scroll area never has to render underneath it.
            */}
            <div className="flex h-full flex-col pb-12">
                <CalendarHeader
                    view={view}
                    onViewChange={setView}
                    month={month}
                    onChangeMonth={(dir) => setMonth((m) => addMonths(m, dir))}
                    dotsByDay={dotsByDay}
                    selectedDay={selectedDay}
                    onSelectDay={handleSelectDay}
                    onDropTodoOnDay={handleDropOnDay}
                    schedulingActive={scheduling.schedulingTodoId !== null}
                    labels={labels}
                    activeLabels={activeLabels}
                    onToggleLabel={toggleLabel}
                />

                <CalendarBody
                    view={view}
                    selectedDay={selectedDay}
                    selectedItems={selectedItems}
                    weekDays={weekDays}
                    labels={labels}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    schedulingTodoId={scheduling.schedulingTodoId}
                    onScheduleDay={scheduling.selectDay}
                />
            </div>

            <InboxDrawer
                todos={undated}
                onDelete={handleDelete}
                schedulingTodoId={scheduling.schedulingTodoId}
                onToggleScheduling={scheduling.toggle}
            />

            <ToolBar onAddTodo={handleAddTodo} labels={labels} prefillTodoDate={selectedDay} />
        </>
    );
};

export default CalendarPage;
