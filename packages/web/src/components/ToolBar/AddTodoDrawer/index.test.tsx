import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddTodoDrawer } from './index';

describe('AddTodoDrawer', () => {
    const noop = () => {};

    it('shows the title field when open', () => {
        render(<AddTodoDrawer open onOpenChange={noop} onAdd={vi.fn()} labels={[]} />);
        expect(screen.getByRole('heading', { name: 'Add Todo' })).toBeInTheDocument();
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
