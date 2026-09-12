import type { Recipe } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RecipeDetailPage from './index';

vi.mock('@imapps/web-utils', () => ({
    useUser: () => ({ user: { id: 'user-1', username: 'testuser' } }),
}));

vi.mock('../../hooks/useRecipeMutations', () => ({
    useRecipeMutations: () => ({ updateRecipe: vi.fn(), deleteRecipe: vi.fn() }),
}));

vi.mock('../../hooks/useManageRecipeUsers', () => ({
    useManageRecipeUsers: () => ({ addUserMutation: {}, removeUserMutation: {} }),
}));

vi.mock('../../components/ToolBar', () => ({ default: () => <div data-testid="toolbar" /> }));
vi.mock('../../components/ManageUsersDrawer', () => ({ ManageUsersDrawer: () => null }));
vi.mock('./CoverImageSection', () => ({ CoverImageSection: () => <div data-testid="cover-image" /> }));
vi.mock('./IngredientSelectSection', () => ({ IngredientSelectSection: () => null }));
vi.mock('./IngredientsSection', () => ({ IngredientsSection: () => null }));
vi.mock('./InstructionsSection', () => ({ InstructionsSection: () => null }));
vi.mock('./TagsSection', () => ({ TagsSection: () => null }));

let mockRecipe: Recipe;

vi.mock('../../api', () => ({
    getRecipeQuery: (id: string) => ({ queryKey: ['recipe', id], queryFn: async () => mockRecipe }),
    getListsQuery: () => ({ queryKey: ['lists'], queryFn: async () => [] }),
    addItemsBulk: vi.fn(),
}));

const renderPage = (recipeId = 'recipe-1') => {
    const queryClient = new QueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/recipes/${recipeId}`]}>
                <Routes>
                    <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe('RecipeDetailPage', () => {
    it('renders a long title in full, without truncating', async () => {
        const longTitle = "Grandma's Slow-Cooked Beef Bourguignon With Red Wine And Root Vegetables";
        mockRecipe = {
            id: 'recipe-1',
            title: longTitle,
            ingredients: [],
            ownerId: 'user-1',
            users: [{ id: 'user-1', username: 'testuser' }],
            dateAdded: new Date(),
        };

        renderPage();

        const heading = await screen.findByRole('heading', { name: longTitle });
        expect(heading.className).not.toContain('truncate');
    });

    it('shows edit and delete actions for the owner', async () => {
        mockRecipe = {
            id: 'recipe-1',
            title: 'Pasta',
            ingredients: [],
            ownerId: 'user-1',
            users: [{ id: 'user-1', username: 'testuser' }],
            dateAdded: new Date(),
        };

        renderPage();

        await screen.findByRole('heading', { name: 'Pasta' });
        expect(screen.getByLabelText('Edit recipe title')).toBeInTheDocument();
        expect(screen.getByLabelText('Delete recipe')).toBeInTheDocument();
    });
});
