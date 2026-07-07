import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { TodoReminderService } from '../../domain/TodoReminderService';
import type { CreateTodoInput, TodoService, UpdateTodoInput } from '../../domain/TodoService';
import { withAuth } from '../handlerUtils';

const getTodoService = (): TodoService => dependencyContainer.resolve(DependencyToken.TodoService);

const getTodoReminderService = (): TodoReminderService =>
    dependencyContainer.resolve(DependencyToken.TodoReminderService);

export const getTodos = withAuth(async (c, user) => {
    return c.json(await getTodoService().getTodosForUser(user.id), 200);
});

export const createTodo = withAuth(async (c, user) => {
    const body = await c.req.json<CreateTodoInput>();
    return c.json(await getTodoService().createTodo(user.id, body), 201);
});

export const updateTodo = withAuth(async (c, user) => {
    const id = c.req.param('id');
    const body = await c.req.json<UpdateTodoInput>();
    return c.json(await getTodoService().updateTodo(id, user.id, body), 200);
});

export const deleteTodo = withAuth(async (c, user) => {
    const id = c.req.param('id');
    await getTodoService().deleteTodo(id, user.id);
    return new Response(null, { status: 204 });
});

export const completeTodo = withAuth(async (c, user) => {
    const id = c.req.param('id');
    const body = await c.req.json<{ date?: string }>().catch(() => ({}) as { date?: string });
    return c.json(await getTodoService().toggleComplete(id, user.id, body.date), 200);
});

/** Test trigger: run the daily due-todo reminder fan-out now (same path as the 08:30 scheduler). */
export const runDailyReminder = withAuth(async (c) => {
    const summary = await getTodoReminderService().sendDailyReminders(new Date());
    return c.json({ triggered: true, ...summary }, 200);
});
