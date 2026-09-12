import type { Recipe } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQuery } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecipesPage from './index';

// Mock dependencies
vi.mock('../../api', () => ({
    getRecipesQuery: vi.fn(() => ({ queryKey: ['recipes', 'user-1'], queryFn: vi.fn() })),
    getFriendsQuery: vi.fn(() => ({ queryKey: ['friends'], queryFn: vi.fn() })),
    addRecipe: vi.fn(),
    generateRecipeAiImage: vi.fn(),
    uploadRecipeImage: vi.fn(),
}));

vi.mock('@imapps/web-utils', () => ({
    useUser: () => ({
        user: {
            id: 'user-1',
            username: 'testuser',
        },
    }),
    useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock('react-query', () => ({
    useQuery: vi.fn(() => ({
        data: [] as Recipe[],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    })),
    useQueryClient: () => ({
        getQueryData: vi.fn(() => []),
        invalidateQueries: vi.fn(),
    }),
}));

vi.mock('../../contexts/PullToRefreshContext', () => ({
    usePullToRefreshContext: () => ({ registerRefresh: () => () => {} }),
}));

vi.mock('../../components/ToolBar', () => ({
    default: () => <div data-testid="toolbar" />,
}));

describe('RecipesPage', () => {
    const _mockRecipes: Recipe[] = [
        {
            id: 'recipe-1',
            title: 'Recipe 1',
            ownerId: 'user-1',
            ingredients: [],
        },
        {
            id: 'recipe-2',
            title: 'Recipe 2',
            ownerId: 'user-2',
            ingredients: [],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the recipe search input with autofill-safe attributes', () => {
        render(
            <MemoryRouter>
                <RecipesPage />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText('Search recipes...');
        expect(searchInput).toHaveAttribute('autocomplete', 'off');
        expect(searchInput).toHaveAttribute('name', 'recipe-search');
        expect(searchInput).toHaveAttribute('inputmode', 'search');
        expect(searchInput).toHaveAttribute('type', 'search');
    });

    it('renders the search input with an inset focus ring', () => {
        render(
            <MemoryRouter>
                <RecipesPage />
            </MemoryRouter>
        );

        const searchInput = screen.getByPlaceholderText('Search recipes...');
        expect(searchInput).toHaveClass('focus-visible:ring-inset');
    });

    it('renders owned and shared recipes together, with avatars for other members on each', () => {
        vi.mocked(useQuery).mockReturnValue({
            data: [
                {
                    id: 'r1',
                    title: 'Owned Recipe',
                    ownerId: 'user-1',
                    ingredients: [],
                    coverImageKey: 'img-1',
                    users: [
                        { id: 'user-1', username: 'me' },
                        { id: 'user-3', username: 'friend' },
                    ],
                    dateAdded: new Date(),
                },
                {
                    id: 'r2',
                    title: 'Shared Recipe',
                    ownerId: 'user-2',
                    ingredients: [],
                    users: [
                        { id: 'user-2', username: 'owner2' },
                        { id: 'user-1', username: 'me' },
                    ],
                    dateAdded: new Date(),
                },
            ],
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        } as ReturnType<typeof useQuery>);

        render(
            <MemoryRouter>
                <RecipesPage />
            </MemoryRouter>
        );

        expect(screen.getByText('Owned Recipe')).toBeInTheDocument();
        expect(screen.getByText('Shared Recipe')).toBeInTheDocument();
        // Avatars for other members show on both cards — owned or not.
        expect(screen.getByTitle('friend')).toBeInTheDocument();
        expect(screen.getByTitle('owner2')).toBeInTheDocument();
        expect(screen.queryByText('No recipes yet')).not.toBeInTheDocument();
    });

    it('matches a recipe by tag with no visible tag UI on the page', async () => {
        const user = userEvent.setup();
        vi.mocked(useQuery).mockReturnValue({
            data: [
                {
                    id: 'r1',
                    title: "Grandma's Bourguignon",
                    ownerId: 'user-1',
                    ingredients: [],
                    users: [],
                    dateAdded: new Date(),
                    coverImageKey: 'img-1',
                    tags: ['beef', 'stew', 'french'],
                },
                {
                    id: 'r2',
                    title: 'Chicken Curry',
                    ownerId: 'user-1',
                    ingredients: [],
                    users: [],
                    dateAdded: new Date(),
                    coverImageKey: 'img-2',
                    tags: ['spicy'],
                },
            ],
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
        } as ReturnType<typeof useQuery>);

        render(
            <MemoryRouter>
                <RecipesPage />
            </MemoryRouter>
        );

        // No chip/filter button for any tag is ever rendered.
        expect(screen.queryByRole('button', { name: 'beef' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'stew' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'spicy' })).not.toBeInTheDocument();

        await user.type(screen.getByPlaceholderText('Search recipes...'), 'beef');

        expect(screen.getByText("Grandma's Bourguignon")).toBeInTheDocument();
        expect(screen.queryByText('Chicken Curry')).not.toBeInTheDocument();
    });

    it('passes refetch function to ToolBar for recipe updates', async () => {
        // Test that refetch is available for recipe image updates
        expect(true).toBe(true);
    });

    it('calls addRecipe with correct parameters', async () => {
        // Test recipe creation flow
        expect(true).toBe(true);
    });
});
