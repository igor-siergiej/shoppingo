import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importRecipe, importRecipeImage } from '../../../api';
import { AddRecipeDrawer } from './index';

vi.mock('../../../hooks/useFriends', () => ({
    useFriends: vi.fn(() => ({ friends: [], isLoading: false })),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../../api', () => ({
    importRecipe: vi.fn(),
    importRecipeImage: vi.fn(),
}));

describe('AddRecipeDrawer', () => {
    const mockOnAdd = vi.fn();
    const mockOnOpenChange = vi.fn();

    beforeEach(() => {
        mockOnAdd.mockClear();
        mockOnOpenChange.mockClear();
    });

    it('renders drawer with recipe title input', () => {
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);

        expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
    });

    it('displays image upload area', () => {
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);

        expect(screen.getByText('Click to upload image')).toBeTruthy();
    });

    it('auto-generates image when no image is uploaded', async () => {
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });

        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);

        const titleInput = screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement;
        await userEvent.type(titleInput, 'Test Recipe');

        const createButton = screen.getByRole('button', { name: /Create Recipe/ });
        await userEvent.click(createButton);

        // Should call onAdd with no imageFile (undefined) so the caller handles AI generation
        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith('Test Recipe', [], undefined, [], undefined, undefined, undefined);
        });
    });

    it('does not show AI Generate button', () => {
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);

        expect(screen.queryByText('AI Generate')).toBeFalsy();
    });

    it('handles image upload by passing file to onAdd', async () => {
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });

        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);

        const titleInput = screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement;
        await userEvent.type(titleInput, 'Another Recipe');

        const imageFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [imageFile] } });
        }

        const createButton = screen.getByRole('button', { name: /Create Recipe/ });
        await userEvent.click(createButton);

        // File should be passed directly to onAdd so the caller uploads it before refetching
        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith(
                'Another Recipe',
                [],
                undefined,
                [],
                undefined,
                undefined,
                imageFile
            );
        });
    });

    it('renders recipe link input', () => {
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
        expect(screen.getByPlaceholderText('https://...')).toBeTruthy();
    });

    it('pre-fills link when initialLink is provided', () => {
        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/recipe"
            />
        );
        const input = screen.getByPlaceholderText('https://...') as HTMLInputElement;
        expect(input.value).toBe('https://example.com/recipe');
    });

    it('renders instructions paste textarea', () => {
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
        expect(screen.getByPlaceholderText(/Paste instructions here/)).toBeTruthy();
    });

    it('splits pasted text into steps on blur', async () => {
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
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
        vi.mocked(importRecipe).mockImplementation(() => new Promise(() => {})); // never resolves
        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/recipe"
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        const textarea = screen.getByPlaceholderText(/Paste instructions here/) as HTMLTextAreaElement;
        await waitFor(() => {
            expect(textarea.disabled).toBe(true);
        });
    });

    it('shows a persistent error banner with a Retry action when import fails', async () => {
        vi.mocked(importRecipe).mockRejectedValueOnce(new Error('This site blocks automated requests'));
        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/blocked"
            />
        );

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
            expect(screen.queryByText('This site blocks automated requests')).toBeFalsy();
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

        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/slow"
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        const cancelButton = await screen.findByRole('button', { name: /Cancel import/ });
        await userEvent.click(cancelButton);

        await waitFor(() => {
            expect(capturedSignal?.aborted).toBe(true);
            expect(screen.queryByRole('button', { name: /Cancel import/ })).toBeFalsy();
        });
        // Cancelling is a user action, not a failure — no error banner.
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
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });

        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/dish"
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(importRecipeImage).toHaveBeenCalledWith('https://example.com/cover.jpg');
        });

        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith(
                'Imported With Image',
                [{ name: 'flour', quantity: undefined, unit: undefined }],
                undefined,
                [],
                'https://example.com/dish',
                ['Mix.'],
                imageFile
            );
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

        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/dish2"
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(screen.getByText('Mix.')).toBeTruthy();
        });
        // Import itself still succeeds — no error banner from the image proxy failure.
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

        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/timed"
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(screen.getByText(/Prep:\s*10 mins/)).toBeTruthy();
            expect(screen.getByText(/Cook:\s*25 mins/)).toBeTruthy();
            expect(screen.getByText(/Yield:\s*4 servings/)).toBeTruthy();
        });
    });

    it('does not show metadata chips when the import has no timing info', () => {
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
        expect(screen.queryByText(/Prep:/)).toBeFalsy();
    });

    it('closes the drawer after recipe creation', async () => {
        mockOnAdd.mockResolvedValue({ id: 'recipe-123' });

        const mockOnOpenChange = vi.fn();
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);

        await userEvent.type(screen.getByPlaceholderText('Enter recipe title...'), 'Pizza Margherita');
        await userEvent.click(screen.getByRole('button', { name: /create recipe/i }));

        await waitFor(() => expect(mockOnOpenChange).toHaveBeenCalledWith(false));
    });

    it('passes link and instructions to onAdd', async () => {
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });
        render(<AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} />);
        const titleInput = screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement;
        await userEvent.type(titleInput, 'My Recipe');

        const linkInput = screen.getByPlaceholderText('https://...') as HTMLInputElement;
        await userEvent.type(linkInput, 'https://example.com');

        const textarea = screen.getByPlaceholderText(/Paste instructions here/) as HTMLTextAreaElement;
        await userEvent.type(textarea, 'Step one{enter}Step two');
        fireEvent.blur(textarea);

        await waitFor(() => {
            expect(screen.getByText('Step one')).toBeTruthy();
        });

        const createButton = screen.getByRole('button', { name: /Create Recipe/ });
        await userEvent.click(createButton);

        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith(
                'My Recipe',
                [],
                undefined,
                [],
                'https://example.com',
                ['Step one', 'Step two'],
                undefined
            );
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
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });

        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                initialLink="https://example.com/dish"
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /Import/ }));

        await waitFor(() => {
            expect(screen.getByText('200 g flour')).toBeTruthy();
            expect(screen.getByText('3 eggs')).toBeTruthy();
            expect(screen.getByText('salt')).toBeTruthy();
        });

        await userEvent.click(screen.getByRole('button', { name: /Create Recipe/ }));

        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith(
                'Imported Dish',
                [
                    { name: 'flour', quantity: 200, unit: 'g' },
                    { name: 'eggs', quantity: 3, unit: undefined },
                    { name: 'salt', quantity: undefined, unit: undefined },
                ],
                undefined,
                [],
                'https://example.com/dish',
                ['Mix.', 'Bake.'],
                undefined
            );
        });
    });
});
