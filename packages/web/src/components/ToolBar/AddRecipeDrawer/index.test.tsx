import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importRecipe } from '../../../api';
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
