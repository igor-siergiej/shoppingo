import type { DiscoveryRecipe, Recipe } from '@shoppingo/types';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api';
import DiscoverRecipePage from './index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@imapps/web-utils', () => ({ useUser: () => ({ user: { id: 'user-1', username: 'me' } }) }));
vi.mock('../../components/ToolBar', () => ({ default: () => <div data-testid="toolbar" /> }));

const SOURCE_URL = 'https://en.wikibooks.org/wiki/Cookbook:Fairy_Cakes';

const library: DiscoveryRecipe = {
    id: 'wikibooks-1',
    title: 'Fairy Cakes',
    ingredients: [
        { id: 'i1', name: 'butter', quantity: 100, unit: 'g' },
        { id: 'i2', name: 'eggs', quantity: 2, unit: 'pcs' },
        { id: 'i3', name: 'jam' },
    ],
    instructions: ['Cream the butter.', 'Bake for 20 minutes.'],
    tags: ['cake', 'dessert'],
    prepTime: 15,
    cookTime: 20,
    servings: 12,
    difficulty: 'easy',
    source: 'wikibooks',
    sourceUrl: SOURCE_URL,
    licence: 'CC-BY-SA-4.0',
    attribution: '"Fairy Cakes" from Wikibooks Cookbook, CC BY-SA 4.0',
    estimated: ['prepTime', 'servings'],
    createdAt: new Date(0),
    updatedAt: new Date(0),
};

const personal = (overrides: Partial<Recipe> = {}): Recipe => ({
    id: 'mine-1',
    title: 'Fairy Cakes',
    ingredients: [],
    users: [{ id: 'user-1', username: 'me' }],
    dateAdded: new Date(),
    ...overrides,
});

const setup = ({
    recipe = library,
    mine = [] as Recipe[],
    similar = [] as Array<Record<string, unknown>>,
    copy = vi.fn(async () => personal({ id: 'new-1', link: SOURCE_URL })),
}: {
    recipe?: DiscoveryRecipe | Error;
    mine?: Recipe[];
    similar?: Array<Record<string, unknown>>;
    copy?: ReturnType<typeof vi.fn>;
} = {}) => {
    vi.spyOn(api, 'getDiscoveryRecipeQuery').mockReturnValue({
        queryKey: ['discover-recipe', 'wikibooks-1'],
        queryFn: async () => {
            if (recipe instanceof Error) throw recipe;
            return recipe;
        },
    } as never);
    vi.spyOn(api, 'getSimilarDiscoveryRecipesQuery').mockReturnValue({
        queryKey: ['discover-similar', 'wikibooks-1'],
        queryFn: async () => similar,
    } as never);
    vi.spyOn(api, 'getRecipesQuery').mockReturnValue({
        queryKey: ['recipes', 'user-1'],
        queryFn: async () => mine,
    } as never);
    vi.spyOn(api, 'copyDiscoveryRecipe').mockImplementation(copy as never);

    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter initialEntries={['/discover/wikibooks-1']}>
                <Routes>
                    <Route path="/discover/:recipeId" element={<DiscoverRecipePage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
    return { copy };
};

describe('DiscoverRecipePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('previews the recipe: ingredients, steps and meta', async () => {
        setup();

        expect(await screen.findByRole('heading', { name: 'Fairy Cakes' })).toBeInTheDocument();
        expect(screen.getByText('100 g butter')).toBeInTheDocument();
        // A bare count reads "2 eggs", not "2 pcs eggs"; a name with no measurement stands alone.
        expect(screen.getByText('2 eggs')).toBeInTheDocument();
        expect(screen.getByText('jam')).toBeInTheDocument();
        expect(screen.getByText('Cream the butter.')).toBeInTheDocument();
        expect(screen.getByText('20m cook')).toBeInTheDocument();
        expect(screen.getByText('Easy')).toBeInTheDocument();
    });

    it('visibly marks estimated values and explains the mark, but not values read from the source', async () => {
        setup();

        await screen.findByRole('heading', { name: 'Fairy Cakes' });
        expect(screen.getByText('≈15m prep')).toBeInTheDocument();
        expect(screen.getByText('≈12 servings')).toBeInTheDocument();
        expect(screen.queryByText('≈20m cook')).not.toBeInTheDocument();
        expect(screen.getByText(/estimated, not stated in the original recipe/)).toBeInTheDocument();
    });

    it('shows no estimate legend when everything came from the source', async () => {
        setup({ recipe: { ...library, estimated: undefined } });

        await screen.findByRole('heading', { name: 'Fairy Cakes' });
        expect(screen.queryByText(/estimated, not stated/)).not.toBeInTheDocument();
    });

    it('shows the attribution and licence, and links to the source page safely', async () => {
        setup();

        const source = await screen.findByRole('region', { name: 'Source' });
        expect(within(source).getByText(/CC BY-SA 4.0/)).toBeInTheDocument();
        expect(within(source).getByText('Licence: CC-BY-SA-4.0')).toBeInTheDocument();
        const link = within(source).getByRole('link', { name: /View the original recipe/ });
        expect(link).toHaveAttribute('href', SOURCE_URL);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('shows a similar-recipes strip and opens a similar recipe', async () => {
        setup({
            similar: [{ id: 'wikibooks-9', title: 'Butterfly Cakes', tags: [], source: 'wikibooks', cookTime: 18 }],
        });

        const strip = await screen.findByRole('region', { name: 'Similar recipes' });
        await userEvent.click(within(strip).getByRole('button', { name: /Butterfly Cakes/ }));

        expect(mockNavigate).toHaveBeenCalledWith('/discover/wikibooks-9');
    });

    it('omits the similar strip when there is nothing similar', async () => {
        setup({ similar: [] });

        await screen.findByRole('heading', { name: 'Fairy Cakes' });
        expect(screen.queryByRole('region', { name: 'Similar recipes' })).not.toBeInTheDocument();
    });

    it('adds the recipe in one tap and then shows it as added, with a way to open it', async () => {
        const { copy } = setup();

        await userEvent.click(await screen.findByRole('button', { name: 'Add to my recipes' }));

        expect(copy).toHaveBeenCalledWith('wikibooks-1');
        expect(await screen.findByRole('button', { name: 'Added to your recipes' })).toBeDisabled();
        expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/recipes/new-1');
    });

    it("does not offer to add a recipe that is already among the user's recipes", async () => {
        const { copy } = setup({ mine: [personal({ id: 'mine-7', link: SOURCE_URL })] });

        const button = await screen.findByRole('button', { name: 'Already in your recipes' });

        expect(button).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Add to my recipes' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/recipes/mine-7');
        expect(copy).not.toHaveBeenCalled();
    });

    it('does not mistake an unrelated recipe for a copy', async () => {
        setup({ mine: [personal({ link: 'https://example.com/other' }), personal({ id: 'mine-2', link: undefined })] });

        expect(await screen.findByRole('button', { name: 'Add to my recipes' })).toBeEnabled();
    });

    it('stops a second tap while the first add is still in flight', async () => {
        let finish: (recipe: Recipe) => void = () => {};
        const copy = vi.fn(
            () =>
                new Promise<Recipe>((resolve) => {
                    finish = resolve;
                })
        );
        setup({ copy });

        await userEvent.click(await screen.findByRole('button', { name: 'Add to my recipes' }));

        expect(await screen.findByRole('button', { name: 'Adding...' })).toBeDisabled();
        finish(personal({ id: 'new-1', link: SOURCE_URL }));
        await screen.findByRole('button', { name: 'Added to your recipes' });
        expect(copy).toHaveBeenCalledTimes(1);
    });

    it('reports a failed add and lets the user try again', async () => {
        const copy = vi
            .fn()
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce(personal({ id: 'new-1', link: SOURCE_URL }));
        setup({ copy });

        await userEvent.click(await screen.findByRole('button', { name: 'Add to my recipes' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Could not add this recipe');

        await userEvent.click(screen.getByRole('button', { name: 'Add to my recipes' }));
        await screen.findByRole('button', { name: 'Added to your recipes' });
    });

    it('says so plainly when the recipe is no longer in the library', async () => {
        setup({ recipe: Object.assign(new Error('Library recipe not found'), { status: 404 }) });

        expect(await screen.findByRole('alert')).toHaveTextContent('Recipe not found');
        expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    });

    it('goes back to the Discover list', async () => {
        setup();

        await userEvent.click(await screen.findByRole('button', { name: 'Discover' }));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/discover'));
    });
});
