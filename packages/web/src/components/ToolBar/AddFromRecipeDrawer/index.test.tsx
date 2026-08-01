import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddFromRecipeDrawer } from './index';

vi.mock('react-query', () => ({
    useQuery: () => ({ data: [] }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@imapps/web-utils', () => ({
    useUser: () => ({ user: { id: 'user-1' } }),
}));

describe('AddFromRecipeDrawer', () => {
    const noop = () => {};

    it('renders its own trigger button by default', () => {
        render(<AddFromRecipeDrawer open={false} onOpenChange={noop} listTitle="Groceries" listItems={[]} />);
        expect(screen.getByLabelText('Add from recipe')).toBeInTheDocument();
    });

    it('hides its trigger button when hideTrigger is true', () => {
        render(
            <AddFromRecipeDrawer open={false} onOpenChange={noop} listTitle="Groceries" listItems={[]} hideTrigger />
        );
        expect(screen.queryByLabelText('Add from recipe')).not.toBeInTheDocument();
    });
});
