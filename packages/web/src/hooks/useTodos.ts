import type { Todo } from '@shoppingo/types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
    completeTodo as apiComplete,
    createTodo as apiCreate,
    deleteTodo as apiDelete,
    updateTodo as apiUpdate,
    type CreateTodoBody,
    getTodosQuery,
} from '../api';

export const useTodos = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries('todos');

    const { data, isLoading, isError, refetch } = useQuery<Todo[]>(getTodosQuery());

    const createMutation = useMutation((body: CreateTodoBody) => apiCreate(body), { onSuccess: invalidate });
    const updateMutation = useMutation(({ id, body }: { id: string; body: Partial<Todo> }) => apiUpdate(id, body), {
        onSuccess: invalidate,
    });
    const deleteMutation = useMutation((id: string) => apiDelete(id), { onSuccess: invalidate });
    const completeMutation = useMutation(({ id, date }: { id: string; date?: string }) => apiComplete(id, date), {
        onSuccess: invalidate,
    });

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
