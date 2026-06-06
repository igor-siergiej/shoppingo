import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { CreateTodoInput, TodoService, UpdateTodoInput } from '../../domain/TodoService';
import { withAuth } from '../handlerUtils';

const getTodoService = (): TodoService => dependencyContainer.resolve(DependencyToken.TodoService);

export const getTodos = withAuth(async (ctx, user) => {
    ctx.status = 200;
    ctx.body = await getTodoService().getTodosByOwner(user.id);
});

export const createTodo = withAuth(async (ctx, user) => {
    ctx.status = 201;
    ctx.body = await getTodoService().createTodo(user.id, ctx.request.body as CreateTodoInput);
});

export const updateTodo = withAuth(async (ctx, user) => {
    const { id } = ctx.params as { id: string };
    ctx.status = 200;
    ctx.body = await getTodoService().updateTodo(id, user.id, ctx.request.body as UpdateTodoInput);
});

export const deleteTodo = withAuth(async (ctx, user) => {
    const { id } = ctx.params as { id: string };
    await getTodoService().deleteTodo(id, user.id);
    ctx.status = 204;
});

export const completeTodo = withAuth(async (ctx, user) => {
    const { id } = ctx.params as { id: string };
    const { date } = (ctx.request.body ?? {}) as { date?: string };
    ctx.status = 200;
    ctx.body = await getTodoService().toggleComplete(id, user.id, date);
});
