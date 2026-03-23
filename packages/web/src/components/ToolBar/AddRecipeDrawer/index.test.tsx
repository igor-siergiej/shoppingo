import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddRecipeDrawer } from './index';

describe('AddRecipeDrawer', () => {
    const mockOnAdd = vi.fn();
    const mockOnRefetch = vi.fn();
    const mockOnOpenChange = vi.fn();

    beforeEach(() => {
        mockOnAdd.mockClear();
        mockOnRefetch.mockClear();
        mockOnOpenChange.mockClear();

        // Mock fetch for image generation
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(new Blob(['image data'])),
            } as Response)
        );
    });

    it('renders drawer with recipe title input', () => {
        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );

        expect(screen.getByPlaceholderText('Enter recipe title...')).toBeTruthy();
    });

    it('displays image upload area', () => {
        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );

        expect(screen.getByText('Click to upload image')).toBeTruthy();
    });

    it('auto-generates image when no image is uploaded', async () => {
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });

        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );

        const titleInput = screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement;
        await userEvent.type(titleInput, 'Test Recipe');

        const createButton = screen.getByRole('button', { name: /Create Recipe/ });
        await userEvent.click(createButton);

        // Should call onAdd with recipe details
        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalledWith('Test Recipe', [], undefined, []);
        });

        // Should attempt image generation via API
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/image/test recipe'),
                expect.objectContaining({ method: 'GET' })
            );
        });

        // Should refetch after image generation
        await waitFor(() => {
            expect(mockOnRefetch).toHaveBeenCalled();
        });
    });

    it('does not show AI Generate button', () => {
        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );

        expect(screen.queryByText('AI Generate')).toBeFalsy();
    });

    it('handles image upload and refetch', async () => {
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });

        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );

        const titleInput = screen.getByPlaceholderText('Enter recipe title...') as HTMLInputElement;
        await userEvent.type(titleInput, 'Another Recipe');

        // Simulate file upload
        const _imageButton = screen.getByText('Click to upload image');
        const imageFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

        // Find the hidden file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            fireEvent.change(fileInput, { target: { files: [imageFile] } });
        }

        const createButton = screen.getByRole('button', { name: /Create Recipe/ });
        await userEvent.click(createButton);

        // Should refetch after image upload
        await waitFor(() => {
            expect(mockOnRefetch).toHaveBeenCalled();
        });
    });
});
