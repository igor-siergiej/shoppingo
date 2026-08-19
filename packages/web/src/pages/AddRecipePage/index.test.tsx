import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRecipeAiImage, importRecipe, importRecipeImage, uploadRecipeImage } from '../../api';
import AddRecipePage from './index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@imapps/web-utils', () => ({
    useUser: () => ({ user: { id: 'user-1', username: 'testuser' } }),
}));

vi.mock('../../hooks/useFriends', () => ({
    useFriends: vi.fn(() => ({ friends: [], isLoading: false })),
}));

vi.mock('sonner', () => ({
    toast: Object.assign(vi.fn(), {
        success: vi.fn(),
        error: vi.fn(),
    }),
}));

const mockCreateRecipe = vi.fn();
vi.mock('../../hooks/useRecipeMutations', () => ({
    useRecipeMutations: () => ({
        createRecipe: mockCreateRecipe,
    }),
}));

let mockRecipesData: Array<{ id: string; title: string; ingredients: unknown[] }> = [];

vi.mock('../../api', () => ({
    importRecipe: vi.fn(),
    importRecipeImage: vi.fn(),
    uploadRecipeImage: vi.fn(),
    generateRecipeAiImage: vi.fn().mockResolvedValue(undefined),
    getRecipesQuery: vi.fn(() => ({ queryKey: ['recipes', 'user-1'], queryFn: async () => mockRecipesData })),
}));

const renderPage = (initialEntry = '/recipes/new') => {
    const queryClient = new QueryClient();
    const result = render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/recipes/new" element={<AddRecipePage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
    return { ...result, queryClient };
};

// Bare renderPage() now lands on the choice screen; these helpers navigate into the
// mode a given test actually needs before its assertions/interactions run.
const enterManualMode = async () => {
    await userEvent.click(screen.getByRole('button', { name: /add manually/i }));
};

const enterImportMode = async () => {
    await userEvent.click(screen.getByRole('button', { name: /import from a link/i }));
};

describe('AddRecipePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreateRecipe.mockResolvedValue('recipe-1');
        mockRecipesData = [];
    });

    it('disables Create Recipe until a title is entered', async () => {
        renderPage();
        await enterManualMode();
        expect(screen.getByRole('button', { name: /create recipe/i })).toBeDisabled();

        await userEvent.type(screen.getByPlaceholderText('Enter recipe title...'), 'X');
        expect(screen.getByRole('button', { name: /create recipe/i })).not.toBeDisabled();
    });

    it('navigates back to /recipes when the footer Cancel button is pressed', async () => {
        renderPage();
        await enterManualMode();
        const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
        await userEvent.click(cancelButtons[cancelButtons.length - 1]);
        expect(mockNavigate).toHaveBeenCalledWith('/recipes');
    });

    it('renders recipe title input', async () => {
        renderPage();
        await enterManualMode();
        expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
    });

    it('displays image upload area', async () => {
        renderPage();
        await enterManualMode();
        expect(screen.getByText('Click to upload image')).toBeTruthy();
    });

    it('auto-generates image when no image is uploaded', async () => {
        renderPage();
        await enterManualMode();

        await userEvent.type(screen.getByPlaceholderText('Enter recipe title...'), 'Test Recipe');
        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(generateRecipeAiImage).toHaveBeenCalledWith('recipe-1');
        });
    });

    it('does not call generateRecipeAiImage when an image was uploaded', async () => {
        renderPage();
        await enterManualMode();

        await userEvent.type(screen.getByPlaceholderText('Enter recipe title...'), 'Another Recipe');
        const imageFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [imageFile] } });

        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(uploadRecipeImage).toHaveBeenCalledWith('recipe-1', imageFile);
        });
        expect(generateRecipeAiImage).not.toHaveBeenCalled();
    });

    it('handles image upload by passing file to uploadRecipeImage', async () => {
        renderPage();
        await enterManualMode();

        await userEvent.type(screen.getByPlaceholderText('Enter recipe title...'), 'Another Recipe');
        const imageFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [imageFile] } });

        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(uploadRecipeImage).toHaveBeenCalledWith('recipe-1', imageFile);
        });
    });

    it('renders recipe link input', async () => {
        renderPage();
        await enterManualMode();
        expect(screen.getByPlaceholderText('https://...')).toBeTruthy();
    });

    it('pre-fills link and auto-imports when sharedUrl search param is present, skipping choice and import screens', async () => {
        vi.mocked(importRecipe).mockResolvedValue({
            title: 'Shared Dish',
            ingredients: [],
            instructions: [],
            link: 'https://example.com/recipe',
        });

        renderPage('/recipes/new?sharedUrl=https%3A%2F%2Fexample.com%2Frecipe');

        const input = screen.getByPlaceholderText('https://...') as HTMLInputElement;
        expect(input.value).toBe('https://example.com/recipe');
        expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
        expect(screen.getByRole('button', { name: /create recipe/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /add manually/i })).toBeFalsy();
        expect(screen.queryByRole('button', { name: /or add manually instead/i })).toBeFalsy();

        await waitFor(() => {
            expect(importRecipe).toHaveBeenCalledWith('https://example.com/recipe', expect.any(AbortSignal));
        });

        expect(screen.queryByRole('button', { name: /add manually/i })).toBeFalsy();
        expect(screen.queryByRole('button', { name: /or add manually instead/i })).toBeFalsy();
    });

    it('renders instructions paste textarea', async () => {
        renderPage();
        await enterManualMode();
        expect(screen.getByPlaceholderText(/Paste instructions here/)).toBeTruthy();
    });

    it('splits pasted text into steps on blur', async () => {
        renderPage();
        await enterManualMode();
        const textarea = screen.getByPlaceholderText(/Paste instructions here/) as HTMLTextAreaElement;
        await userEvent.type(textarea, 'Step one{enter}Step two{enter}Step three');
        fireEvent.blur(textarea);
        await waitFor(() => {
            expect(screen.getByText('Step one')).toBeTruthy();
            expect(screen.getByText('Step two')).toBeTruthy();
            expect(screen.getByText('Step three')).toBeTruthy();
        });
    });

    it('disables the instructions textarea while an import is in flight', async () => {
        vi.mocked(importRecipe).mockImplementation(() => new Promise(() => {}));
        renderPage('/recipes/new?sharedUrl=https%3A%2F%2Fexample.com%2Frecipe');

        const textarea = screen.getByPlaceholderText(/Paste instructions here/) as HTMLTextAreaElement;
        await waitFor(() => {
            expect(textarea.disabled).toBe(true);
        });
    });

    it('lets the user cancel an in-flight import', async () => {
        let capturedSignal: AbortSignal | undefined;
        vi.mocked(importRecipe).mockImplementation(
            (_url: string, signal?: AbortSignal) =>
                new Promise((_resolve, reject) => {
                    capturedSignal = signal;
                    signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
                })
        );

        renderPage('/recipes/new?sharedUrl=https%3A%2F%2Fexample.com%2Fslow');

        const cancelButton = await screen.findByRole('button', { name: /Cancel import/ });
        await userEvent.click(cancelButton);

        await waitFor(() => {
            expect(capturedSignal?.aborted).toBe(true);
            expect(screen.queryByRole('button', { name: /Cancel import/ })).toBeFalsy();
        });
        expect(screen.queryByText('Aborted')).toBeFalsy();
    });

    it('auto-attaches the scraped cover image after a successful import', async () => {
        vi.mocked(importRecipe).mockResolvedValue({
            title: 'Imported With Image',
            ingredients: [{ id: 'i1', name: 'flour' }],
            instructions: ['Mix.'],
            link: 'https://example.com/dish',
            image: 'https://example.com/cover.jpg',
        });
        const imageFile = new File(['bytes'], 'imported-cover.jpg', { type: 'image/jpeg' });
        vi.mocked(importRecipeImage).mockResolvedValue(imageFile);

        renderPage('/recipes/new?sharedUrl=https%3A%2F%2Fexample.com%2Fdish');

        await waitFor(() => {
            expect(importRecipeImage).toHaveBeenCalledWith('https://example.com/cover.jpg');
        });

        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(uploadRecipeImage).toHaveBeenCalledWith('recipe-1', imageFile);
        });
    });

    it('does not block the import when the cover image proxy fails', async () => {
        vi.mocked(importRecipe).mockResolvedValue({
            title: 'Imported No Image',
            ingredients: [],
            instructions: ['Mix.'],
            link: 'https://example.com/dish2',
            image: 'https://example.com/cover2.jpg',
        });
        vi.mocked(importRecipeImage).mockRejectedValue(new Error('proxy failed'));

        renderPage('/recipes/new?sharedUrl=https%3A%2F%2Fexample.com%2Fdish2');

        await waitFor(() => {
            expect(screen.getByText('Mix.')).toBeTruthy();
        });
        expect(screen.queryByText('proxy failed')).toBeFalsy();
    });

    it('shows scraped prep/cook time and yield as read-only chips after import', async () => {
        vi.mocked(importRecipe).mockResolvedValue({
            title: 'Timed Dish',
            ingredients: [],
            instructions: ['Mix.'],
            link: 'https://example.com/timed',
            prepTime: '10 mins',
            cookTime: '25 mins',
            recipeYield: '4 servings',
        });

        renderPage('/recipes/new?sharedUrl=https%3A%2F%2Fexample.com%2Ftimed');

        await waitFor(() => {
            expect(screen.getByText(/Prep:\s*10 mins/)).toBeTruthy();
            expect(screen.getByText(/Cook:\s*25 mins/)).toBeTruthy();
            expect(screen.getByText(/Yield:\s*4 servings/)).toBeTruthy();
        });
    });

    it('does not show metadata chips when the import has no timing info', async () => {
        renderPage();
        await enterManualMode();
        expect(screen.queryByText(/Prep:/)).toBeFalsy();
    });

    it('navigates to /recipes after successful recipe creation', async () => {
        renderPage();
        await enterManualMode();
        mockCreateRecipe.mockImplementation(async () => {
            mockRecipesData = [{ id: 'recipe-1', title: 'Pizza Margherita', ingredients: [] }];
            return 'recipe-1';
        });

        await userEvent.type(screen.getByPlaceholderText('Enter recipe title...'), 'Pizza Margherita');
        await userEvent.click(screen.getByRole('button', { name: /create recipe/i }));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/recipes'));
    });

    it('passes link and instructions to createRecipe', async () => {
        renderPage();
        await enterManualMode();
        await userEvent.type(screen.getByPlaceholderText('Enter recipe title...'), 'My Recipe');
        await userEvent.type(screen.getByPlaceholderText('https://...'), 'https://example.com');

        const textarea = screen.getByPlaceholderText(/Paste instructions here/) as HTMLTextAreaElement;
        await userEvent.type(textarea, 'Step one{enter}Step two');
        fireEvent.blur(textarea);

        await waitFor(() => {
            expect(screen.getByText('Step one')).toBeTruthy();
        });

        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(mockCreateRecipe).toHaveBeenCalledWith('My Recipe', [], [], 'https://example.com', [
                'Step one',
                'Step two',
            ]);
        });
    });

    it('preserves quantity/unit parsed from an imported recipe when creating it', async () => {
        vi.mocked(importRecipe).mockResolvedValue({
            title: 'Imported Dish',
            ingredients: [
                { id: 'i1', name: 'flour', quantity: 200, unit: 'g' },
                { id: 'i2', name: 'eggs', quantity: 3 },
                { id: 'i3', name: 'salt' },
            ],
            instructions: ['Mix.', 'Bake.'],
            link: 'https://example.com/dish',
        });

        renderPage('/recipes/new?sharedUrl=https%3A%2F%2Fexample.com%2Fdish');

        await waitFor(() => {
            expect(screen.getByText('200 g flour')).toBeTruthy();
            expect(screen.getByText('3 eggs')).toBeTruthy();
            expect(screen.getByText('salt')).toBeTruthy();
        });

        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(mockCreateRecipe).toHaveBeenCalledWith(
                'Imported Dish',
                [],
                [
                    { name: 'flour', quantity: 200, unit: 'g' },
                    { name: 'eggs', quantity: 3, unit: undefined },
                    { name: 'salt', quantity: undefined, unit: undefined },
                ],
                'https://example.com/dish',
                ['Mix.', 'Bake.']
            );
        });
    });

    it('renders the choice screen by default with no sharedUrl param', () => {
        renderPage();
        expect(screen.getByRole('button', { name: /import from a link/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /add manually/i })).toBeTruthy();
        expect(screen.queryByPlaceholderText('Enter recipe title...')).toBeFalsy();
    });

    it('clicking Import from a link shows the import screen', async () => {
        renderPage();
        await enterImportMode();
        expect(screen.getByPlaceholderText('https://...')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Import recipe from link/i })).toBeTruthy();
        expect(screen.queryByPlaceholderText('Enter recipe title...')).toBeFalsy();
    });

    it('clicking Add manually shows the full form, empty', async () => {
        renderPage();
        await enterManualMode();
        const titleInput = screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement;
        expect(titleInput.value).toBe('');
    });

    it('navigates to /recipes when the choice screen Cancel button is pressed', async () => {
        renderPage();
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockNavigate).toHaveBeenCalledWith('/recipes');
    });

    it('a successful import via the choice→import path transitions to a pre-filled form', async () => {
        vi.mocked(importRecipe).mockResolvedValue({
            title: 'Imported Dish',
            ingredients: [{ id: 'i1', name: 'flour', quantity: 200, unit: 'g' }],
            instructions: ['Mix.', 'Bake.'],
            link: 'https://example.com/dish',
        });

        renderPage();
        await enterImportMode();

        await userEvent.type(screen.getByPlaceholderText('https://...'), 'https://example.com/dish');
        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
        });
        expect((screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement).value).toBe('Imported Dish');
        expect(screen.getByText('200 g flour')).toBeTruthy();
        expect(screen.getByText('Mix.')).toBeTruthy();
    });

    it('on import failure, shows an inline error with Retry and Switch to manual on the import screen', async () => {
        vi.mocked(importRecipe).mockRejectedValueOnce(new Error('This site blocks automated requests'));
        renderPage();
        await enterImportMode();

        await userEvent.type(screen.getByPlaceholderText('https://...'), 'https://example.com/blocked');
        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(screen.getByText('This site blocks automated requests')).toBeTruthy();
        });
        expect(screen.getByRole('button', { name: /Retry/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Switch to manual/ })).toBeTruthy();
        expect(screen.queryByPlaceholderText('Enter recipe title...')).toBeFalsy();
    });

    it('clicking Retry after a failure succeeds and transitions to form', async () => {
        vi.mocked(importRecipe).mockRejectedValueOnce(new Error('This site blocks automated requests'));
        renderPage();
        await enterImportMode();

        await userEvent.type(screen.getByPlaceholderText('https://...'), 'https://example.com/blocked');
        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(screen.getByText('This site blocks automated requests')).toBeTruthy();
        });

        vi.mocked(importRecipe).mockResolvedValueOnce({
            title: 'Recovered',
            ingredients: [],
            instructions: [],
            link: 'https://example.com/blocked',
        });

        await userEvent.click(screen.getByRole('button', { name: /Retry/ }));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
        });
        expect((screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement).value).toBe('Recovered');
    });

    it('clicking Switch to manual after a failure moves to form with the link retained and everything else empty', async () => {
        vi.mocked(importRecipe).mockRejectedValueOnce(new Error('This site blocks automated requests'));
        renderPage();
        await enterImportMode();

        await userEvent.type(screen.getByPlaceholderText('https://...'), 'https://example.com/blocked');
        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(screen.getByText('This site blocks automated requests')).toBeTruthy();
        });

        await userEvent.click(screen.getByRole('button', { name: /Switch to manual/ }));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
        });
        expect((screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement).value).toBe('');
        expect((screen.getByPlaceholderText('https://...') as HTMLInputElement).value).toBe(
            'https://example.com/blocked'
        );
    });

    it('clicking "or add manually instead" with no error moves straight to an empty form', async () => {
        renderPage();
        await enterImportMode();

        await userEvent.click(screen.getByRole('button', { name: /or add manually instead/i }));

        expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
        expect((screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement).value).toBe('');
    });
});
