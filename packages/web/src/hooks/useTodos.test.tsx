import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
