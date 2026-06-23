# Todos + Calendar — Phase 2: Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the web experience for first-class todos: a month-grid Calendar page, an Inbox drawer with drag-to-schedule, an Add-Todo flow with time/label/recurrence fields, label management, and the new Calendar nav slot.

**Architecture:** A new `CalendarPage` consumes `useTodos` + `useLabels` (react-query v3) and renders a `MonthGrid`, a per-day list, and a collapsible `InboxDrawer`. Recurring todos are expanded client-side by a pure `expandOccurrences` util. The bottom `ToolBar` gains a context-aware Add-Todo drawer and a Calendar nav button placed right of the `+`, with the app-bar restructured to space items evenly.

**Tech Stack:** React 19, react-router v7, react-query v3, date-fns v4, shadcn/ui (Drawer, Select, Calendar, Popover), lucide-react, **Vitest + @testing-library/react + jsdom** (NOTE: web tests use Vitest, not `bun:test` — CLAUDE.md is stale on this point; follow the existing 44 Vitest specs).

**Phase:** 2 of 3 (Web). Depends on **Phase 1 (backend)** being merged. Phase 3 = E2E.

**Spec:** `docs/superpowers/specs/2026-06-06-first-class-todos-calendar-design.md`

---

## File Structure

**API client + hooks**
- Modify: `packages/web/src/api/index.ts` — todo + label request functions and query factories.
- Create: `packages/web/src/hooks/useTodos.ts`
- Create: `packages/web/src/hooks/useTodos.test.ts`
- Create: `packages/web/src/hooks/useLabels.ts`

**Recurrence**
- Create: `packages/web/src/utils/recurrence.ts`
- Create: `packages/web/src/utils/recurrence.test.ts`

**Calendar page + components**
- Create: `packages/web/src/pages/CalendarPage/index.tsx`
- Create: `packages/web/src/components/Calendar/MonthGrid/index.tsx`
- Create: `packages/web/src/components/Calendar/MonthGrid/index.test.tsx`
- Create: `packages/web/src/components/Calendar/DayTodoList/index.tsx`
- Create: `packages/web/src/components/Calendar/InboxDrawer/index.tsx`
- Create: `packages/web/src/components/Calendar/LabelFilter/index.tsx`

**Add-todo + field components**
- Create: `packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx`
- Create: `packages/web/src/components/ToolBar/AddTodoDrawer/index.test.tsx`
- Create: `packages/web/src/components/TimeField/index.tsx`
- Create: `packages/web/src/components/LabelSelect/index.tsx`
- Create: `packages/web/src/components/RecurrenceField/index.tsx`

**Label management**
- Create: `packages/web/src/components/ManageLabelsDrawer/index.tsx`
- Modify: `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx` — entry to open Manage Labels.

**Nav + routing**
- Modify: `packages/web/src/index.tsx` — add lazy `CalendarPage` + `/calendar` route.
- Modify: `packages/web/src/components/ToolBar/index.tsx` — `onAddTodo` prop, calendar-page detection, AddTodoDrawer wiring.
- Modify: `packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx` — Calendar button right of `+`, even spacing, todo drawer slot.

**Cleanup (remove old list-bound todo UI)**
- Modify: `packages/web/src/components/ToolBar/AddItemDrawer/index.tsx`
- Modify: `packages/web/src/components/ItemCheckBox/ItemCheckBoxCard/index.tsx`
- Modify: `packages/web/src/pages/ItemsPage/EmptyState/*` and any other `ListType.TODO` references.

---

## Task 1: API client — todos + labels

**Files:**
- Modify: `packages/web/src/api/index.ts`

- [ ] **Step 1: Add types import and request functions**

At the top of `packages/web/src/api/index.ts`, extend the types import:

```ts
import type { Item, Label, ListResponse, ListType, Recipe, Todo, User } from '@shoppingo/types';
```

Define a shared client input type and add functions at the end of the file (before the trailing `generateTimestamp`):

```ts
export interface CreateTodoBody {
    title: string;
    dueDate?: Date;
    time?: string;
    labelId?: string;
    recurrence?: Todo['recurrence'];
}

export const getTodosQuery = () => ({
    queryKey: ['todos'],
    queryFn: async () => await getTodos(),
});

const getTodos = async (): Promise<Array<Todo>> => {
    return await makeRequest({
        pathname: '/api/todos',
        method: MethodType.GET,
        operationString: 'get todos',
    });
};

export const createTodo = async (body: CreateTodoBody): Promise<Todo> => {
    return await makeRequest({
        pathname: '/api/todos',
        method: MethodType.PUT,
        operationString: 'create todo',
        body: JSON.stringify(body),
    });
};

export const updateTodo = async (id: string, body: Partial<Todo>): Promise<Todo> => {
    return await makeRequest({
        pathname: `/api/todos/${encodeURIComponent(id)}`,
        method: MethodType.POST,
        operationString: 'update todo',
        body: JSON.stringify(body),
    });
};

export const deleteTodo = async (id: string): Promise<void> => {
    return await makeRequest({
        pathname: `/api/todos/${encodeURIComponent(id)}`,
        method: MethodType.DELETE,
        operationString: 'delete todo',
    });
};

export const completeTodo = async (id: string, date?: string): Promise<Todo> => {
    return await makeRequest({
        pathname: `/api/todos/${encodeURIComponent(id)}/complete`,
        method: MethodType.POST,
        operationString: 'complete todo',
        body: JSON.stringify(date !== undefined ? { date } : {}),
    });
};

export const getLabelsQuery = () => ({
    queryKey: ['labels'],
    queryFn: async () => await getLabels(),
});

const getLabels = async (): Promise<Array<Label>> => {
    return await makeRequest({
        pathname: '/api/labels',
        method: MethodType.GET,
        operationString: 'get labels',
    });
};

export const createLabel = async (body: { name: string; color: string }): Promise<Label> => {
    return await makeRequest({
        pathname: '/api/labels',
        method: MethodType.PUT,
        operationString: 'create label',
        body: JSON.stringify(body),
    });
};

export const updateLabel = async (id: string, body: { name?: string; color?: string }): Promise<Label> => {
    return await makeRequest({
        pathname: `/api/labels/${encodeURIComponent(id)}`,
        method: MethodType.POST,
        operationString: 'update label',
        body: JSON.stringify(body),
    });
};

export const deleteLabel = async (id: string): Promise<void> => {
    return await makeRequest({
        pathname: `/api/labels/${encodeURIComponent(id)}`,
        method: MethodType.DELETE,
        operationString: 'delete label',
    });
};
```

- [ ] **Step 2: Type-check**

Run: `bun run tsc --noEmit`
Expected: PASS (relies on Phase 1 `Todo`/`Label` types).

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api/index.ts
git commit -m "feat(web): add todo and label api client functions"
```

---

## Task 2: Recurrence expansion util

**Files:**
- Create: `packages/web/src/utils/recurrence.ts`
- Test: `packages/web/src/utils/recurrence.test.ts`

`expandOccurrences` turns a todo into its visible occurrences within `[rangeStart, rangeEnd]`. Non-recurring todos yield at most one occurrence (their `dueDate`). Recurring todos step from their `dueDate` anchor by `interval` units of `freq`, stopping at `until` (if set) or `rangeEnd`. Each occurrence's `done` is read from `completedDates` for recurring, or `todo.done` for single.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import type { Todo } from '@shoppingo/types';
import { expandOccurrences, isoDay } from './recurrence';

const base: Todo = {
    id: 't1',
    ownerId: 'u1',
    title: 'X',
    done: false,
    dateAdded: new Date('2026-06-01'),
};

const range = (a: string, b: string) => ({ start: new Date(a), end: new Date(b) });

describe('isoDay', () => {
    it('formats a date as yyyy-MM-dd', () => {
        expect(isoDay(new Date('2026-06-04T10:00:00'))).toBe('2026-06-04');
    });
});

describe('expandOccurrences', () => {
    it('returns nothing for an undated non-recurring todo', () => {
        const { start, end } = range('2026-06-01', '2026-06-30');
        expect(expandOccurrences(base, start, end)).toEqual([]);
    });

    it('returns a single occurrence for a dated todo in range', () => {
        const todo = { ...base, dueDate: new Date('2026-06-04'), done: true };
        const { start, end } = range('2026-06-01', '2026-06-30');
        const occ = expandOccurrences(todo, start, end);
        expect(occ).toHaveLength(1);
        expect(isoDay(occ[0].date)).toBe('2026-06-04');
        expect(occ[0].done).toBe(true);
    });

    it('excludes a dated todo outside the range', () => {
        const todo = { ...base, dueDate: new Date('2026-07-04') };
        const { start, end } = range('2026-06-01', '2026-06-30');
        expect(expandOccurrences(todo, start, end)).toEqual([]);
    });

    it('expands a daily recurrence within the range', () => {
        const todo: Todo = {
            ...base,
            dueDate: new Date('2026-06-03'),
            recurrence: { freq: 'daily', interval: 1 },
        };
        const { start, end } = range('2026-06-03', '2026-06-06');
        const days = expandOccurrences(todo, start, end).map((o) => isoDay(o.date));
        expect(days).toEqual(['2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06']);
    });

    it('honours interval > 1 (every 2 days)', () => {
        const todo: Todo = {
            ...base,
            dueDate: new Date('2026-06-01'),
            recurrence: { freq: 'daily', interval: 2 },
        };
        const { start, end } = range('2026-06-01', '2026-06-06');
        const days = expandOccurrences(todo, start, end).map((o) => isoDay(o.date));
        expect(days).toEqual(['2026-06-01', '2026-06-03', '2026-06-05']);
    });

    it('stops at the until date', () => {
        const todo: Todo = {
            ...base,
            dueDate: new Date('2026-06-01'),
            recurrence: { freq: 'daily', interval: 1, until: new Date('2026-06-03') },
        };
        const { start, end } = range('2026-06-01', '2026-06-30');
        const days = expandOccurrences(todo, start, end).map((o) => isoDay(o.date));
        expect(days).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
    });

    it('marks per-occurrence done from completedDates', () => {
        const todo: Todo = {
            ...base,
            dueDate: new Date('2026-06-01'),
            recurrence: { freq: 'weekly', interval: 1 },
            completedDates: ['2026-06-08'],
        };
        const { start, end } = range('2026-06-01', '2026-06-15');
        const occ = expandOccurrences(todo, start, end);
        expect(occ.map((o) => isoDay(o.date))).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
        expect(occ.map((o) => o.done)).toEqual([false, true, false]);
    });

    it('only emits recurring occurrences within range when anchor precedes range', () => {
        const todo: Todo = {
            ...base,
            dueDate: new Date('2026-05-30'),
            recurrence: { freq: 'daily', interval: 1 },
        };
        const { start, end } = range('2026-06-01', '2026-06-02');
        const days = expandOccurrences(todo, start, end).map((o) => isoDay(o.date));
        expect(days).toEqual(['2026-06-01', '2026-06-02']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test src/utils/recurrence.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`packages/web/src/utils/recurrence.ts`:

```ts
import type { Recurrence, Todo } from '@shoppingo/types';
import { addDays, addMonths, addWeeks, addYears, format, isAfter, isBefore } from 'date-fns';

export interface Occurrence {
    date: Date;
    done: boolean;
}

export const isoDay = (date: Date): string => format(date, 'yyyy-MM-dd');

const step = (date: Date, recurrence: Recurrence): Date => {
    const n = recurrence.interval;
    switch (recurrence.freq) {
        case 'daily':
            return addDays(date, n);
        case 'weekly':
            return addWeeks(date, n);
        case 'monthly':
            return addMonths(date, n);
        case 'yearly':
            return addYears(date, n);
    }
};

const normalize = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const expandOccurrences = (todo: Todo, rangeStart: Date, rangeEnd: Date): Occurrence[] => {
    if (!todo.dueDate) {
        return [];
    }

    const anchor = normalize(new Date(todo.dueDate));
    const start = normalize(rangeStart);
    const end = normalize(rangeEnd);
    const completed = new Set(todo.completedDates ?? []);

    if (!todo.recurrence) {
        if (isBefore(anchor, start) || isAfter(anchor, end)) {
            return [];
        }
        return [{ date: anchor, done: todo.done }];
    }

    const hardEnd = todo.recurrence.until ? normalize(new Date(todo.recurrence.until)) : end;
    const limit = isBefore(hardEnd, end) ? hardEnd : end;

    const occurrences: Occurrence[] = [];
    let cursor = anchor;
    // Guard against pathological loops.
    for (let i = 0; i < 1000 && !isAfter(cursor, limit); i += 1) {
        if (!isBefore(cursor, start)) {
            occurrences.push({ date: cursor, done: completed.has(isoDay(cursor)) });
        }
        cursor = step(cursor, todo.recurrence);
    }
    return occurrences;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/web test src/utils/recurrence.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/utils/recurrence.ts packages/web/src/utils/recurrence.test.ts
git commit -m "feat(web): add recurrence occurrence-expansion util"
```

---

## Task 3: useTodos hook

**Files:**
- Create: `packages/web/src/hooks/useTodos.ts`
- Test: `packages/web/src/hooks/useTodos.test.ts`

react-query v3 query + mutations. Mutations invalidate `['todos']` on success.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import type { ReactNode } from 'react';
import * as api from '../api';
import { useTodos } from './useTodos';

vi.mock('../api');

const wrapper = ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useTodos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads todos', async () => {
        vi.spyOn(api, 'getTodosQuery').mockReturnValue({
            queryKey: ['todos'],
            queryFn: async () => [{ id: 't1', ownerId: 'u', title: 'A', done: false, dateAdded: new Date() }],
        } as never);

        const { result } = renderHook(() => useTodos(), { wrapper });
        await waitFor(() => expect(result.current.todos).toHaveLength(1));
        expect(result.current.todos[0].title).toBe('A');
    });

    it('createTodo calls api', async () => {
        vi.spyOn(api, 'getTodosQuery').mockReturnValue({ queryKey: ['todos'], queryFn: async () => [] } as never);
        const createSpy = vi.spyOn(api, 'createTodo').mockResolvedValue({} as never);

        const { result } = renderHook(() => useTodos(), { wrapper });
        await act(async () => {
            await result.current.createTodo({ title: 'New' });
        });
        expect(createSpy).toHaveBeenCalledWith({ title: 'New' });
    });

    it('completeTodo calls api with id and date', async () => {
        vi.spyOn(api, 'getTodosQuery').mockReturnValue({ queryKey: ['todos'], queryFn: async () => [] } as never);
        const completeSpy = vi.spyOn(api, 'completeTodo').mockResolvedValue({} as never);

        const { result } = renderHook(() => useTodos(), { wrapper });
        await act(async () => {
            await result.current.completeTodo('t1', '2026-06-04');
        });
        expect(completeSpy).toHaveBeenCalledWith('t1', '2026-06-04');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test src/hooks/useTodos.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`packages/web/src/hooks/useTodos.ts`:

```ts
import type { Todo } from '@shoppingo/types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
    type CreateTodoBody,
    completeTodo as apiComplete,
    createTodo as apiCreate,
    deleteTodo as apiDelete,
    updateTodo as apiUpdate,
    getTodosQuery,
} from '../api';

export const useTodos = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries('todos');

    const { data, isLoading, isError, refetch } = useQuery<Todo[]>(getTodosQuery());

    const createMutation = useMutation((body: CreateTodoBody) => apiCreate(body), { onSuccess: invalidate });
    const updateMutation = useMutation(
        ({ id, body }: { id: string; body: Partial<Todo> }) => apiUpdate(id, body),
        { onSuccess: invalidate }
    );
    const deleteMutation = useMutation((id: string) => apiDelete(id), { onSuccess: invalidate });
    const completeMutation = useMutation(
        ({ id, date }: { id: string; date?: string }) => apiComplete(id, date),
        { onSuccess: invalidate }
    );

    return {
        todos: data ?? [],
        isLoading,
        isError,
        refetch,
        createTodo: (body: CreateTodoBody) => createMutation.mutateAsync(body),
        updateTodo: (id: string, body: Partial<Todo>) => updateMutation.mutateAsync({ id, body }),
        deleteTodo: (id: string) => deleteMutation.mutateAsync(id),
        completeTodo: (id: string, date?: string) => completeMutation.mutateAsync({ id, date }),
    };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/web test src/hooks/useTodos.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useTodos.ts packages/web/src/hooks/useTodos.test.ts
git commit -m "feat(web): add useTodos hook"
```

---

## Task 4: useLabels hook

**Files:**
- Create: `packages/web/src/hooks/useLabels.ts`

Mirrors `useTodos`. No standalone test (covered indirectly by `ManageLabelsDrawer` and `CalendarPage` tests); it is thin glue over the api functions.

- [ ] **Step 1: Write the implementation**

`packages/web/src/hooks/useLabels.ts`:

```ts
import type { Label } from '@shoppingo/types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
    createLabel as apiCreate,
    deleteLabel as apiDelete,
    updateLabel as apiUpdate,
    getLabelsQuery,
} from '../api';

export const useLabels = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries('labels');
        queryClient.invalidateQueries('todos');
    };

    const { data, isLoading } = useQuery<Label[]>(getLabelsQuery());

    const createMutation = useMutation((body: { name: string; color: string }) => apiCreate(body), {
        onSuccess: invalidate,
    });
    const updateMutation = useMutation(
        ({ id, body }: { id: string; body: { name?: string; color?: string } }) => apiUpdate(id, body),
        { onSuccess: invalidate }
    );
    const deleteMutation = useMutation((id: string) => apiDelete(id), { onSuccess: invalidate });

    return {
        labels: data ?? [],
        isLoading,
        createLabel: (body: { name: string; color: string }) => createMutation.mutateAsync(body),
        updateLabel: (id: string, body: { name?: string; color?: string }) => updateMutation.mutateAsync({ id, body }),
        deleteLabel: (id: string) => deleteMutation.mutateAsync(id),
    };
};
```

- [ ] **Step 2: Type-check** — Run: `bun run tsc --noEmit`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useLabels.ts
git commit -m "feat(web): add useLabels hook"
```

---

## Task 5: Field components — TimeField, LabelSelect, RecurrenceField

**Files:**
- Create: `packages/web/src/components/TimeField/index.tsx`
- Create: `packages/web/src/components/LabelSelect/index.tsx`
- Create: `packages/web/src/components/RecurrenceField/index.tsx`

- [ ] **Step 1: Write TimeField**

`packages/web/src/components/TimeField/index.tsx`:

```ts
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface TimeFieldProps {
    value: string | undefined; // 'HH:mm'
    onChange: (value: string | undefined) => void;
}

export const TimeField = ({ value, onChange }: TimeFieldProps) => (
    <div className="space-y-2">
        <Label htmlFor="todo-time">Time (Optional)</Label>
        <Input
            id="todo-time"
            type="time"
            className="h-12 text-base"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
        />
    </div>
);
```

- [ ] **Step 2: Write LabelSelect**

`packages/web/src/components/LabelSelect/index.tsx`:

```ts
import type { Label as LabelType } from '@shoppingo/types';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const NONE = '__none__';

export interface LabelSelectProps {
    labels: LabelType[];
    value: string | undefined; // labelId
    onChange: (labelId: string | undefined) => void;
}

export const LabelSelect = ({ labels, value, onChange }: LabelSelectProps) => (
    <div className="space-y-2">
        <Label>Label (Optional)</Label>
        <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? undefined : v)}>
            <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="No label" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={NONE}>No label</SelectItem>
                {labels.map((label) => (
                    <SelectItem key={label.id} value={label.id}>
                        <span className="inline-flex items-center gap-2">
                            <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{ backgroundColor: label.color }}
                            />
                            {label.name}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);
```

- [ ] **Step 3: Write RecurrenceField**

`packages/web/src/components/RecurrenceField/index.tsx`:

```ts
import type { Recurrence } from '@shoppingo/types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const NONE = 'none';
type Freq = Recurrence['freq'];

export interface RecurrenceFieldProps {
    value: Recurrence | undefined;
    onChange: (value: Recurrence | undefined) => void;
}

export const RecurrenceField = ({ value, onChange }: RecurrenceFieldProps) => {
    const freq: Freq | typeof NONE = value?.freq ?? NONE;

    const setFreq = (next: string) => {
        if (next === NONE) {
            onChange(undefined);
        } else {
            onChange({ freq: next as Freq, interval: value?.interval ?? 1 });
        }
    };

    const setInterval = (raw: string) => {
        if (!value) return;
        const n = Math.max(1, parseInt(raw, 10) || 1);
        onChange({ ...value, interval: n });
    };

    return (
        <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={freq} onValueChange={setFreq}>
                <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
            </Select>
            {value && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Every</span>
                    <Input
                        type="number"
                        min={1}
                        className="h-10 w-20"
                        value={value.interval}
                        onChange={(e) => setInterval(e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">{value.freq.replace('ly', '(s)')}</span>
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 4: Type-check** — Run: `bun run tsc --noEmit`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/TimeField packages/web/src/components/LabelSelect packages/web/src/components/RecurrenceField
git commit -m "feat(web): add TimeField, LabelSelect, RecurrenceField"
```

---

## Task 6: AddTodoDrawer

**Files:**
- Create: `packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx`
- Test: `packages/web/src/components/ToolBar/AddTodoDrawer/index.test.tsx`

Mirrors `AddItemDrawer`. Fields: title (required), `DueDateField` (optional — empty = inbox), `TimeField`, `LabelSelect`, `RecurrenceField`. `prefillDate` seeds the due date when a calendar day was tapped. Calls `onAdd(body: CreateTodoBody)`.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddTodoDrawer } from './index';

describe('AddTodoDrawer', () => {
    const noop = () => {};

    it('shows the title field when open', () => {
        render(<AddTodoDrawer open onOpenChange={noop} onAdd={vi.fn()} labels={[]} />);
        expect(screen.getByText('Add Todo')).toBeInTheDocument();
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
    });

    it('requires a title', async () => {
        const onAdd = vi.fn();
        render(<AddTodoDrawer open onOpenChange={noop} onAdd={onAdd} labels={[]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }));
        await waitFor(() => expect(screen.getByText('Title is required')).toBeInTheDocument());
        expect(onAdd).not.toHaveBeenCalled();
    });

    it('submits the title and prefilled date', async () => {
        const onAdd = vi.fn().mockResolvedValue(undefined);
        const prefill = new Date('2026-06-04');
        render(<AddTodoDrawer open onOpenChange={noop} onAdd={onAdd} labels={[]} prefillDate={prefill} />);
        fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Buy milk' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }));
        await waitFor(() =>
            expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Buy milk', dueDate: prefill }))
        );
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test src/components/ToolBar/AddTodoDrawer/index.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`packages/web/src/components/ToolBar/AddTodoDrawer/index.tsx`:

```tsx
import type { Label as LabelType, Recurrence } from '@shoppingo/types';
import { Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
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
import type { CreateTodoBody } from '../../../api';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/web test src/components/ToolBar/AddTodoDrawer/index.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ToolBar/AddTodoDrawer
git commit -m "feat(web): add AddTodoDrawer"
```

---

## Task 7: MonthGrid

**Files:**
- Create: `packages/web/src/components/Calendar/MonthGrid/index.tsx`
- Test: `packages/web/src/components/Calendar/MonthGrid/index.test.tsx`

Renders a 7-column month grid for a given `month`. Each `DayCell` shows the day number, up to 3 colour dots (from `dotsByDay`), a selected highlight, and accepts a dropped todo (HTML5 drag-and-drop) to schedule it on that day.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthGrid } from './index';

describe('MonthGrid', () => {
    const month = new Date('2026-06-15');

    it('renders all days of the month', () => {
        render(
            <MonthGrid
                month={month}
                dotsByDay={{}}
                selectedDay={new Date('2026-06-04')}
                onSelectDay={vi.fn()}
                onDropTodoOnDay={vi.fn()}
            />
        );
        expect(screen.getByText('30')).toBeInTheDocument(); // June has 30 days
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('calls onSelectDay when a day is clicked', () => {
        const onSelectDay = vi.fn();
        render(
            <MonthGrid
                month={month}
                dotsByDay={{}}
                selectedDay={undefined}
                onSelectDay={onSelectDay}
                onDropTodoOnDay={vi.fn()}
            />
        );
        fireEvent.click(screen.getByText('4'));
        expect(onSelectDay).toHaveBeenCalled();
        const arg = onSelectDay.mock.calls[0][0] as Date;
        expect(arg.getDate()).toBe(4);
    });

    it('fires onDropTodoOnDay with the todo id on drop', () => {
        const onDrop = vi.fn();
        render(
            <MonthGrid
                month={month}
                dotsByDay={{}}
                selectedDay={undefined}
                onSelectDay={vi.fn()}
                onDropTodoOnDay={onDrop}
            />
        );
        const cell = screen.getByText('4');
        const dataTransfer = { getData: () => 'todo-123' };
        fireEvent.drop(cell, { dataTransfer });
        expect(onDrop).toHaveBeenCalledWith('todo-123', expect.any(Date));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test src/components/Calendar/MonthGrid/index.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`packages/web/src/components/Calendar/MonthGrid/index.tsx`:

```tsx
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
                    <div key={`${d}-${i}`} className="text-center text-xs text-muted-foreground">
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
                                            key={`${key}-dot-${i}`}
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
```

Note: the test's mock `dataTransfer.getData` ignores its argument, so `getData('text/plain')` returns `'todo-123'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/web test src/components/Calendar/MonthGrid/index.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/Calendar/MonthGrid
git commit -m "feat(web): add MonthGrid calendar component"
```

---

## Task 8: DayTodoList, InboxDrawer, LabelFilter

**Files:**
- Create: `packages/web/src/components/Calendar/DayTodoList/index.tsx`
- Create: `packages/web/src/components/Calendar/InboxDrawer/index.tsx`
- Create: `packages/web/src/components/Calendar/LabelFilter/index.tsx`

These are presentational; they are exercised through the `CalendarPage` test in Task 9. No standalone tests.

- [ ] **Step 1: Write DayTodoList**

`packages/web/src/components/Calendar/DayTodoList/index.tsx`:

```tsx
import type { Label } from '@shoppingo/types';
import { Checkbox } from '../../ui/checkbox';

export interface DayTodoItem {
    todoId: string;
    title: string;
    time?: string;
    done: boolean;
    labelColor?: string;
    occurrenceDay: string; // dayKey of the occurrence
}

export interface DayTodoListProps {
    items: DayTodoItem[];
    labels: Label[];
    onToggle: (todoId: string, occurrenceDay: string) => void;
}

export const DayTodoList = ({ items, onToggle }: DayTodoListProps) => {
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No todos for this day</p>;
    }
    return (
        <ul className="space-y-2 py-2">
            {items.map((item) => (
                <li
                    key={`${item.todoId}-${item.occurrenceDay}`}
                    className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
                >
                    <span
                        className="w-1 self-stretch rounded"
                        style={{ backgroundColor: item.labelColor ?? 'transparent' }}
                    />
                    <Checkbox checked={item.done} onCheckedChange={() => onToggle(item.todoId, item.occurrenceDay)} />
                    <span className="text-xs text-muted-foreground w-12">{item.time ?? 'all day'}</span>
                    <span className={item.done ? 'line-through text-muted-foreground' : ''}>{item.title}</span>
                </li>
            ))}
        </ul>
    );
};
```

- [ ] **Step 2: Write InboxDrawer**

`packages/web/src/components/Calendar/InboxDrawer/index.tsx`:

```tsx
import type { Todo } from '@shoppingo/types';
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { useState } from 'react';

export interface InboxDrawerProps {
    todos: Todo[]; // undated todos
}

export const InboxDrawer = ({ todos }: InboxDrawerProps) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="fixed bottom-24 left-0 right-0 z-30 px-4">
            <div className="mx-auto max-w-[500px] rounded-t-xl border bg-background shadow-lg">
                <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2"
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className="flex items-center gap-2 text-sm font-medium">
                        <Inbox className="h-4 w-4" />
                        Inbox ({todos.length})
                    </span>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
                {open && (
                    <ul className="max-h-48 overflow-y-auto px-4 pb-3 space-y-2">
                        {todos.length === 0 && (
                            <li className="text-sm text-muted-foreground py-2">Nothing unscheduled</li>
                        )}
                        {todos.map((todo) => (
                            <li
                                key={todo.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', todo.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                className="cursor-grab rounded-lg bg-muted/40 px-3 py-2 text-sm active:cursor-grabbing"
                            >
                                {todo.title}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Write LabelFilter**

`packages/web/src/components/Calendar/LabelFilter/index.tsx`:

```tsx
import type { Label } from '@shoppingo/types';

export interface LabelFilterProps {
    labels: Label[];
    active: Set<string>;
    onToggle: (labelId: string) => void;
}

export const LabelFilter = ({ labels, active, onToggle }: LabelFilterProps) => {
    if (labels.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 py-2">
            {labels.map((label) => {
                const on = active.has(label.id);
                return (
                    <button
                        type="button"
                        key={label.id}
                        onClick={() => onToggle(label.id)}
                        className={[
                            'rounded-full px-3 py-1 text-xs border flex items-center gap-1.5',
                            on ? 'border-primary' : 'border-transparent bg-muted/40',
                        ].join(' ')}
                    >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                        {label.name}
                    </button>
                );
            })}
        </div>
    );
};
```

- [ ] **Step 4: Type-check** — Run: `bun run tsc --noEmit`. Expected: PASS (after renaming the field to `occurrenceDay`).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/Calendar/DayTodoList packages/web/src/components/Calendar/InboxDrawer packages/web/src/components/Calendar/LabelFilter
git commit -m "feat(web): add DayTodoList, InboxDrawer, LabelFilter"
```

---

## Task 9: CalendarPage

**Files:**
- Create: `packages/web/src/pages/CalendarPage/index.tsx`
- Test: `packages/web/src/pages/CalendarPage/index.test.tsx`

Wires everything: month state, `useTodos` + `useLabels`, builds `dotsByDay` and the selected-day list from `expandOccurrences`, filters by active labels, renders `LabelFilter` + `MonthGrid` + `DayTodoList` + `InboxDrawer`, and the `ToolBar` with `onAddTodo`. Drop-on-day and inbox toggling call `updateTodo`/`completeTodo`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CalendarPage from './index';

// ToolBar pulls in auth/user/router providers; stub it for this unit test.
vi.mock('../../components/ToolBar', () => ({ default: () => null }));
vi.mock('../../hooks/useTodos', () => ({
    useTodos: () => ({
        todos: [
            {
                id: 't1',
                ownerId: 'u',
                title: 'Standup',
                done: false,
                dateAdded: new Date('2026-06-01'),
                dueDate: new Date('2026-06-04'),
            },
            { id: 't2', ownerId: 'u', title: 'Someday', done: false, dateAdded: new Date('2026-06-01') },
        ],
        isLoading: false,
        isError: false,
        createTodo: vi.fn(),
        updateTodo: vi.fn(),
        completeTodo: vi.fn(),
    }),
}));
vi.mock('../../hooks/useLabels', () => ({
    useLabels: () => ({ labels: [], isLoading: false }),
}));

describe('CalendarPage', () => {
    it('renders the inbox count of undated todos', () => {
        render(
            <MemoryRouter>
                <CalendarPage />
            </MemoryRouter>
        );
        expect(screen.getByText(/Inbox \(1\)/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --filter @shoppingo/web test src/pages/CalendarPage/index.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`packages/web/src/pages/CalendarPage/index.tsx`:

```tsx
import type { CreateTodoBody } from '../../api';
import { useMemo, useState } from 'react';
import ToolBar from '../../components/ToolBar';
import { DayTodoList, type DayTodoItem } from '../../components/Calendar/DayTodoList';
import { InboxDrawer } from '../../components/Calendar/InboxDrawer';
import { LabelFilter } from '../../components/Calendar/LabelFilter';
import { MonthGrid, dayKey } from '../../components/Calendar/MonthGrid';
import { Button } from '../../components/ui/button';
import { useLabels } from '../../hooks/useLabels';
import { useTodos } from '../../hooks/useTodos';
import { endOfMonth, format, startOfMonth, addMonths } from 'date-fns';
import { expandOccurrences, isoDay } from '../../utils/recurrence';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        () =>
            activeLabels.size === 0 ? todos : todos.filter((t) => t.labelId && activeLabels.has(t.labelId)),
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
                (dots[key] ??= []).push(color ?? '#3b82f6');
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run --filter @shoppingo/web test src/pages/CalendarPage/index.test.tsx`
Expected: PASS (1 test). (The `ToolBar` props `onAddTodo`, `labels`, `prefillTodoDate` are added in Task 10; if running this test before Task 10, the type-check will flag them — proceed to Task 10 then re-run.)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/CalendarPage
git commit -m "feat(web): add CalendarPage"
```

---

## Task 10: ToolBar — Add-Todo wiring + Calendar detection

**Files:**
- Modify: `packages/web/src/components/ToolBar/index.tsx`

- [ ] **Step 1: Extend props and detection**

In `ToolBarProps`, add:

```ts
    onAddTodo?: (body: import('../../api').CreateTodoBody) => Promise<void>;
    labels?: import('@shoppingo/types').Label[];
    prefillTodoDate?: Date;
```

In the component body, destructure `onAddTodo`, `labels`, `prefillTodoDate`, add page detection alongside the existing flags:

```ts
    const isCalendarPage = location.pathname === '/calendar';
```

Add a drawer-open state next to `isAddIngredientDrawerOpen`:

```ts
    const [isAddTodoDrawerOpen, setIsAddTodoDrawerOpen] = useState(false);
```

Import the drawer at the top:

```ts
import { AddTodoDrawer } from './AddTodoDrawer';
```

- [ ] **Step 2: Pass the todo drawer + calendar flag to `ToolBarAppBar`**

Add these props to the `<ToolBarAppBar ... />` element:

```tsx
                                isCalendarPage={isCalendarPage}
                                todoDrawer={
                                    isCalendarPage && onAddTodo ? (
                                        <AddTodoDrawer
                                            open={isAddTodoDrawerOpen}
                                            onOpenChange={setIsAddTodoDrawerOpen}
                                            onAdd={onAddTodo}
                                            labels={labels ?? []}
                                            prefillDate={prefillTodoDate}
                                        />
                                    ) : undefined
                                }
```

- [ ] **Step 3: Type-check** — Run: `bun run tsc --noEmit`. Expected: PASS once Task 11 adds the `ToolBarAppBar` props (`isCalendarPage`, `todoDrawer`). Do Task 11 next.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ToolBar/index.tsx
git commit -m "feat(web): wire AddTodoDrawer into ToolBar on calendar page"
```

---

## Task 11: ToolBarAppBar — Calendar button right of `+`, even spacing

**Files:**
- Modify: `packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx`

- [ ] **Step 1: Extend the props interface**

Add to `ToolBarAppBarProps`:

```ts
    isCalendarPage?: boolean;
    todoDrawer?: ReactNode;
```

Add `Calendar` to the lucide import:

```ts
import { ArrowLeft, BookOpen, Calendar, CheckCheck, Menu, ShoppingCart, Trash2 } from 'lucide-react';
```

Destructure `isCalendarPage` and `todoDrawer` in the component params.

- [ ] **Step 2: Restructure the bar to an evenly-spaced row**

Replace the outer container and its three sections with a single evenly-spaced flex row. Order: nav (back OR cart+recipes), center add (context), Calendar button, right actions + menu.

Replace the `return (...)` body's root element:

```tsx
        return (
            <div ref={ref} className="flex w-full items-center justify-around py-2.5 px-3">
                {/* Left: back or primary nav */}
                {showBackButton ? (
                    <ToolBarButton icon={ArrowLeft} title="Go back" onClick={handleGoBack} />
                ) : (
                    <>
                        <ToolBarButton
                            icon={ShoppingCart}
                            title="Shopping lists"
                            onClick={() => navigate('/')}
                            active={isListsPage}
                        />
                        <ToolBarButton
                            icon={BookOpen}
                            title="Recipes"
                            onClick={() => navigate('/recipes')}
                            active={isRecipesPage}
                        />
                    </>
                )}

                {/* Center: context-aware add */}
                {isItemsPage && itemDrawer}
                {isListsPage && listDrawer}
                {isRecipesPage && recipeDrawer}
                {isRecipeDetailPage && ingredientDrawer}
                {isCalendarPage && todoDrawer}
                {isItemsPage && recipePickerDrawer}

                {/* Calendar nav — right of the + */}
                <ToolBarButton
                    icon={Calendar}
                    title="Calendar"
                    onClick={() => navigate('/calendar')}
                    active={isCalendarPage}
                />

                {/* Right: contextual actions + menu */}
                {onClearSelected && (
                    <ToolBarButton
                        icon={CheckCheck}
                        title="Clear selected items"
                        onClick={onClearSelected}
                        disabled={disableClearSelected}
                    />
                )}
                {onRemoveAll && (
                    <ToolBarButton
                        icon={Trash2}
                        title="Remove all items"
                        onClick={onRemoveAll}
                        disabled={disableClearAll}
                        variant="destructive"
                    />
                )}
                {isRecipeDetailPage && onToggleSelectMode && (
                    <ToolBarButton icon={ShoppingCart} title="Add to shopping list" onClick={onToggleSelectMode} />
                )}
                <ToolBarButton icon={Menu} title="Menu" onClick={onMenuClick} />
            </div>
        );
```

- [ ] **Step 3: Update the existing ToolBarAppBar test**

The current `index.test.tsx` checks for a Recipes button. Add a case verifying the Calendar button renders and navigates. Append inside the existing `describe`:

```tsx
    it('renders a Calendar button that navigates to /calendar', () => {
        render(<ToolBarAppBar {...baseProps} isCalendarPage={false} />);
        const buttons = screen.getAllByRole('button');
        const calendarButton = Array.from(buttons).find((btn) => btn.title === 'Calendar');
        expect(calendarButton).toBeDefined();
    });
```

(Use the same `baseProps` and render setup already present in that test file; if it lacks a `baseProps` object, mirror the existing render call used by the Recipes test.)

- [ ] **Step 4: Run tests + type-check**

Run: `bun run --filter @shoppingo/web test src/components/ToolBar/ToolBarAppBar/index.test.tsx`
Expected: PASS.

Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ToolBar/ToolBarAppBar/
git commit -m "feat(web): add Calendar nav button with even spacing"
```

---

## Task 12: Route registration

**Files:**
- Modify: `packages/web/src/index.tsx`

- [ ] **Step 1: Add the lazy page**

After the other `lazyLoadPage` declarations (around line 43), add:

```ts
const CalendarPage = lazyLoadPage(() => import('./pages/CalendarPage'), 'calendar page');
```

- [ ] **Step 2: Add the route**

Inside the protected `/` route's `children` array, add an entry alongside `recipes`:

```tsx
            {
                path: 'calendar',
                element: (
                    <Suspense fallback={<LoadingPage />}>
                        <CalendarPage />
                    </Suspense>
                ),
            },
```

- [ ] **Step 3: Build + type-check**

Run: `bun run tsc --noEmit`
Expected: PASS.

Run: `bun run --filter @shoppingo/web build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/index.tsx
git commit -m "feat(web): register /calendar route"
```

---

## Task 13: ManageLabelsDrawer + menu entry

**Files:**
- Create: `packages/web/src/components/ManageLabelsDrawer/index.tsx`
- Modify: `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx`
- Modify: `packages/web/src/components/ToolBar/index.tsx` (render the drawer + open state)

- [ ] **Step 1: Write ManageLabelsDrawer**

`packages/web/src/components/ManageLabelsDrawer/index.tsx`:

```tsx
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLabels } from '../../hooks/useLabels';
import { Button } from '../ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '../ui/drawer';
import { Input } from '../ui/input';

export interface ManageLabelsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DEFAULT_COLOR = '#3b82f6';

export const ManageLabelsDrawer = ({ open, onOpenChange }: ManageLabelsDrawerProps) => {
    const { labels, createLabel, deleteLabel } = useLabels();
    const [name, setName] = useState('');
    const [color, setColor] = useState(DEFAULT_COLOR);

    const handleCreate = async () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        await createLabel({ name: trimmed, color });
        setName('');
        setColor(DEFAULT_COLOR);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm flex flex-col h-[500px] max-h-[500px]">
                    <DrawerHeader className="flex-shrink-0">
                        <DrawerTitle>Manage Labels</DrawerTitle>
                        <DrawerDescription>Create and remove calendar labels</DrawerDescription>
                    </DrawerHeader>
                    <div className="flex-1 overflow-y-auto px-4 space-y-2">
                        {labels.map((label) => (
                            <div key={label.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: label.color }} />
                                <span className="flex-1">{label.name}</span>
                                <Button variant="ghost" size="icon" onClick={() => void deleteLabel(label.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <DrawerFooter>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                aria-label="Label colour"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-10 w-12 rounded border"
                            />
                            <Input
                                value={name}
                                placeholder="Label name"
                                className="h-10"
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleCreate();
                                }}
                            />
                            <Button onClick={handleCreate}>Add</Button>
                        </div>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
```

- [ ] **Step 2: Add a "Manage Labels" action to HamburgerMenu**

Open `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx`. It already accepts an `onManageUsers` callback pattern. Add an optional `onManageLabels?: () => void` prop and render a menu button for it (mirror the existing "Manage Users" button markup, using the `Tag` icon from `lucide-react`). Render the button whenever `onManageLabels` is provided.

- [ ] **Step 3: Render the drawer + state in ToolBar**

In `packages/web/src/components/ToolBar/index.tsx`:

Add open state near the other drawer states:

```ts
    const [isManageLabelsOpen, setIsManageLabelsOpen] = useState(false);
```

Import:

```ts
import { ManageLabelsDrawer } from '../ManageLabelsDrawer';
```

Pass `onManageLabels` to `HamburgerMenu` (only meaningful on the calendar page, but harmless elsewhere — gate on `isCalendarPage`):

```tsx
                                                        onManageLabels={
                                                            isCalendarPage
                                                                ? () => {
                                                                      setIsManageLabelsOpen(true);
                                                                      setIsMenuOpen(false);
                                                                      setMenuActive(null);
                                                                  }
                                                                : undefined
                                                        }
```

Render the drawer near the `ManageUsersDrawer` at the bottom of the component:

```tsx
            <ManageLabelsDrawer open={isManageLabelsOpen} onOpenChange={setIsManageLabelsOpen} />
```

- [ ] **Step 4: Type-check + build**

Run: `bun run tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ManageLabelsDrawer packages/web/src/components/ToolBar/HamburgerMenu/index.tsx packages/web/src/components/ToolBar/index.tsx
git commit -m "feat(web): add label management drawer and menu entry"
```

---

## Task 14: Remove legacy list-bound todo UI

**Files:**
- Modify: `packages/web/src/components/ToolBar/AddItemDrawer/index.tsx`
- Modify: `packages/web/src/components/ItemCheckBox/ItemCheckBoxCard/index.tsx`
- Modify: any other `ListType.TODO` references surfaced by grep.

- [ ] **Step 1: Find all references**

Run: `grep -rn "ListType.TODO\|ListTypeEnum.TODO" packages/web/src`
Expected: references in `AddItemDrawer`, `ItemCheckBoxCard`, `ItemCheckBox/index.test.tsx`, possibly `EmptyState`, `ItemCheckBoxList`, `AddListDrawer`.

- [ ] **Step 2: Simplify AddItemDrawer**

In `packages/web/src/components/ToolBar/AddItemDrawer/index.tsx`:
- Remove the `dueDate` state, the `DueDateField` import and its render block, and the `setDueDate` reset lines.
- Replace the `title` computation `const title = listType === ListTypeEnum.TODO ? 'Add New Task' : 'Add New Item';` with `const title = 'Add New Item';`.
- Replace the conditional label text with `'Item Name'`.
- The quantity/unit field should now always render for shopping lists; remove the TODO branch entirely. Since `ListType` now only has `SHOPPING`, the `listType === ListTypeEnum.SHOPPING` and `!listType` branches can be merged into always rendering `QuantityUnitField`.
- Remove the now-unused `dueDate` param from `onAdd` if no longer needed; keep the signature `onAdd(name, quantity?, unit?)`. Update `AddItemDrawerProps.onAdd` and the call site in `ItemsPage`/`useItemPageMutations` accordingly. Run `grep -rn "onAddItem" packages/web/src` to find call sites and drop the `dueDate` argument.

- [ ] **Step 3: Remove DueDateBadge from ItemCheckBoxCard**

In `packages/web/src/components/ItemCheckBox/ItemCheckBoxCard/index.tsx`, remove the line:

```tsx
{listType === ListTypeEnum.TODO && <DueDateBadge dueDate={item.dueDate} />}
```

and its `DueDateBadge` import if unused. `DueDateBadge`, `DueDateField`, and `normaliseDueDate` remain in the codebase (reused by todos).

- [ ] **Step 4: Resolve remaining references**

For each remaining hit from Step 1 (e.g. `EmptyState` text branching on list type, `ItemCheckBox/index.test.tsx` fixtures using `dueDate`), remove the TODO-specific branch and any now-dead `dueDate` test fixtures. The `Item.dueDate` field can remain in the type for now (harmless, unused) — do not spend effort removing it.

- [ ] **Step 5: Type-check + full web test + build**

Run: `bun run tsc --noEmit`
Expected: PASS.

Run: `bun run --filter @shoppingo/web test`
Expected: PASS — all existing specs (adjusted) plus new ones.

Run: `bun run --filter @shoppingo/web build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A packages/web/src
git commit -m "refactor(web): remove legacy list-bound todo UI"
```

---

## Task 15: Manual smoke + lint

- [ ] **Step 1: Lint**

Run: `bun run lint:fix` then `bun run lint`
Expected: clean.

- [ ] **Step 2: Manual smoke (mock auth)**

Run: `bun run start:with-mock`
Verify in the browser at `http://localhost:4000/calendar`:
- Calendar icon shows in the bottom bar, right of the `+`, items evenly spaced.
- `+` opens Add Todo; creating a dated todo shows a coloured dot and a row under the selected day.
- Creating an undated todo appears in the Inbox drawer.
- Dragging an inbox todo onto a day schedules it (dot appears, inbox count drops).
- Toggling a todo's checkbox marks it done; recurring todos toggle only the chosen day.
- Hamburger → Manage Labels: create a label, assign via Add Todo, see its colour; delete it and confirm todos lose the colour.

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "chore(web): lint fixes for todos calendar"
```

---

## Phase 2 Done — Definition of Done

- `bun run --filter @shoppingo/web test` passes.
- `bun run tsc --noEmit` passes; `bun run --filter @shoppingo/web build` succeeds; `bun run lint` clean.
- Calendar page reachable at `/calendar` via the new bottom-bar Calendar button (right of `+`, evenly spaced).
- Add/complete/schedule todos, recurrence dots, inbox drag-to-schedule, and label management all work in the mock-auth smoke test.

**Next:** Phase 3 (Playwright E2E).
