import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WasteWarriorDrawer } from './index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@imapps/web-utils', () => ({
    useUser: () => ({ user: { id: 'user-1' } }),
}));

let mockRecipes: unknown[] = [];
vi.mock('react-query', () => ({
    useQuery: () => ({ data: mockRecipes }),
}));

describe('WasteWarriorDrawer', () => {
    const noop = () => {};

    it('renders the search input with autofill-safe attributes', () => {
        render(<WasteWarriorDrawer open onOpenChange={noop} />);

        const searchInput = screen.getByPlaceholderText('e.g. spinach');
        expect(searchInput).toHaveAttribute('autocomplete', 'off');
        expect(searchInput).toHaveAttribute('name', 'waste-warrior-search');
        expect(searchInput).toHaveAttribute('inputmode', 'search');
        expect(searchInput).toHaveAttribute('type', 'search');
    });

    it('shows a prompt instead of results when the query is empty', () => {
        render(<WasteWarriorDrawer open onOpenChange={noop} />);
        expect(screen.getByText('Type an ingredient to see recipes that use it.')).toBeInTheDocument();
    });

    it('shows a clear empty state when nothing matches', async () => {
        mockRecipes = [];
        const user = userEvent.setup();
        render(<WasteWarriorDrawer open onOpenChange={noop} />);

        await user.type(screen.getByPlaceholderText('e.g. spinach'), 'spinach');

        expect(screen.getByText(/No recipes use anything like/)).toBeInTheDocument();
    });

    it('lists matching recipes badged with the ingredient that matched, ranked by score', async () => {
        mockRecipes = [
            { id: 'r1', title: 'Chicken Soup', ingredients: [{ id: 'i1', name: 'chicken' }], users: [] },
            { id: 'r2', title: 'Spinach Curry', ingredients: [{ id: 'i2', name: 'spinach' }], users: [] },
        ];
        const user = userEvent.setup();
        render(<WasteWarriorDrawer open onOpenChange={noop} />);

        await user.type(screen.getByPlaceholderText('e.g. spinach'), 'spinach');

        expect(screen.getByText('Spinach Curry')).toBeInTheDocument();
        expect(screen.getByText('uses spinach')).toBeInTheDocument();
        expect(screen.queryByText('Chicken Soup')).not.toBeInTheDocument();
    });

    it('navigates to the recipe detail page and closes when a result is tapped', async () => {
        mockRecipes = [{ id: 'r1', title: 'Spinach Curry', ingredients: [{ id: 'i1', name: 'spinach' }], users: [] }];
        const onOpenChange = vi.fn();
        const user = userEvent.setup();
        render(<WasteWarriorDrawer open onOpenChange={onOpenChange} />);

        await user.type(screen.getByPlaceholderText('e.g. spinach'), 'spinach');
        await user.click(screen.getByText('Spinach Curry'));

        expect(mockNavigate).toHaveBeenCalledWith('/recipes/r1');
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
