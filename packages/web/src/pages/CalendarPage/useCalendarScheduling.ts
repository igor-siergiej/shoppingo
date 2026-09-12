import { useState } from 'react';

// HTML5 drag-and-drop from the inbox never fires on touch devices, so tapping an
// inbox item then tapping a day is the reliable way to assign a due date on mobile.
export const useCalendarScheduling = (onSchedule: (todoId: string, day: Date) => void) => {
    const [schedulingTodoId, setSchedulingTodoId] = useState<string | null>(null);

    const toggle = (todoId: string) => setSchedulingTodoId((prev) => (prev === todoId ? null : todoId));

    const selectDay = (day: Date) => {
        if (!schedulingTodoId) return;
        onSchedule(schedulingTodoId, day);
        setSchedulingTodoId(null);
    };

    return { schedulingTodoId, toggle, selectDay };
};
