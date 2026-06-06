import type { Context } from 'koa';
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { CreateTodoInput, TodoService, UpdateTodoInput } from '../../domain/TodoService';

const getTodoService = (): TodoService => dependencyContainer.resolve(DependencyToken.TodoService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

const getUser = (ctx: Context): { id: string; username: string } | null => {
    const user = ctx.state.user as { id: string; username: string } | undefined;
    return user?.id ? user : null;
};

const fail = (ctx: Context, error: unknown) => {
    const err = error as { status?: number; message?: string };
    ctx.status = err.status ?? 500;
    ctx.body = { error: err.message ?? 'Internal Server Error' };
};

export const getTodos = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        ctx.status = 200;
        ctx.body = await getTodoService().getTodosByOwner(user.id);
    } catch (error) {
        getLogger().error('API: Failed to list todos', { userId: user.id });
        fail(ctx, error);
    }
};

export const createTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        const body = ctx.request.body as CreateTodoInput;
        ctx.status = 201;
        ctx.body = await getTodoService().createTodo(user.id, body);
    } catch (error) {
        fail(ctx, error);
    }
};

export const updateTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        const body = ctx.request.body as UpdateTodoInput;
        ctx.status = 200;
        ctx.body = await getTodoService().updateTodo(id, user.id, body);
    } catch (error) {
        fail(ctx, error);
    }
};

export const deleteTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        await getTodoService().deleteTodo(id, user.id);
        ctx.status = 204;
    } catch (error) {
        fail(ctx, error);
    }
};

export const completeTodo = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        const { date } = (ctx.request.body ?? {}) as { date?: string };
        ctx.status = 200;
        ctx.body = await getTodoService().toggleComplete(id, user.id, date);
    } catch (error) {
        fail(ctx, error);
    }
};
