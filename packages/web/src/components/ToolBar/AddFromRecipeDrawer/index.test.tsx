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

    it('renders the recipe search input with autofill-safe attributes', () => {
        render(<AddFromRecipeDrawer open onOpenChange={noop} listTitle="Groceries" listItems={[]} />);

        const searchInput = screen.getByPlaceholderText('Search recipes...');
        expect(searchInput).toHaveAttribute('autocomplete', 'off');
        expect(searchInput).toHaveAttribute('name', 'add-from-recipe-search');
        expect(searchInput).toHaveAttribute('inputmode', 'search');
        expect(searchInput).not.toHaveAttribute('type', 'search');
    });
});
