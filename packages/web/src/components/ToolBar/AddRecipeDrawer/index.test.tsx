import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddRecipeDrawer } from './index';

vi.mock('../../../api', () => ({
    uploadRecipeImage: vi.fn(() => Promise.resolve({ imageKey: 'test-key' })),
    setCoverImageKey: vi.fn(() => Promise.resolve({ id: 'recipe-1' })),
}));

vi.mock('../../../hooks/useSearch', () => ({
    useSearch: vi.fn(() => ({
        query: '',
        setQuery: vi.fn(),
        results: { success: 'false', usernames: [], count: 0, query: '' },
        isLoading: false,
        error: null,
        clearResults: vi.fn(),
    })),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

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
            expect(mockOnAdd).toHaveBeenCalledWith('Test Recipe', [], undefined, [], undefined, undefined);
        });

        // Should attempt image generation via API
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/image/Test%20Recipe'),
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

    it('renders recipe link input', () => {
        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );
        expect(screen.getByPlaceholderText('https://...')).toBeTruthy();
    });

    it('pre-fills link when initialLink is provided', () => {
        render(
            <AddRecipeDrawer
                open={true}
                onOpenChange={mockOnOpenChange}
                onAdd={mockOnAdd}
                onRefetch={mockOnRefetch}
                initialLink="https://example.com/recipe"
            />
        );
        const input = screen.getByPlaceholderText('https://...') as HTMLInputElement;
        expect(input.value).toBe('https://example.com/recipe');
    });

    it('renders instructions paste textarea', () => {
        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );
        expect(screen.getByPlaceholderText(/Paste instructions here/)).toBeTruthy();
    });

    it('splits pasted text into steps on blur', async () => {
        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );
        const textarea = screen.getByPlaceholderText(/Paste instructions here/) as HTMLTextAreaElement;
        await userEvent.type(textarea, 'Step one{enter}Step two{enter}Step three');
        fireEvent.blur(textarea);
        await waitFor(() => {
            expect(screen.getByText('Step one')).toBeTruthy();
            expect(screen.getByText('Step two')).toBeTruthy();
            expect(screen.getByText('Step three')).toBeTruthy();
        });
    });

    it('passes link and instructions to onAdd', async () => {
        mockOnAdd.mockResolvedValue({ id: 'recipe-1' });
        render(
            <AddRecipeDrawer open={true} onOpenChange={mockOnOpenChange} onAdd={mockOnAdd} onRefetch={mockOnRefetch} />
        );
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
            expect(mockOnAdd).toHaveBeenCalledWith('My Recipe', [], undefined, [], 'https://example.com', [
                'Step one',
                'Step two',
            ]);
        });
    });
});
