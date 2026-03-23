import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { Recipe } from '@shoppingo/types';
import { render, screen, waitFor } from '@testing-library/preact';
import { RecipeCard } from './index';

describe('RecipeCard', () => {
    const mockRecipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        ownerId: 'user-1',
        coverImageKey: 'test-image',
        ingredients: [
            { id: 'ing-1', name: 'Ingredient 1' },
            { id: 'ing-2', name: 'Ingredient 2' },
        ],
    };

    const mockRecipeNoImage: Recipe = {
        ...mockRecipe,
        coverImageKey: undefined,
    };

    beforeEach(() => {
        // Mock fetch for image loading
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                blob: () => Promise.resolve(new Blob(['image data'])),
            } as Response)
        );

        // Mock URL.createObjectURL and revokeObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    it('renders recipe card with title', () => {
        render(<RecipeCard recipe={mockRecipe} onClick={vi.fn()} />);

        expect(screen.getByText('Test Recipe')).toBeTruthy();
    });

    it('displays ingredient count', () => {
        render(<RecipeCard recipe={mockRecipe} onClick={vi.fn()} />);

        expect(screen.getByText('2 ingredients')).toBeTruthy();
    });

    it('fetches and displays image when coverImageKey is present', async () => {
        render(<RecipeCard recipe={mockRecipe} onClick={vi.fn()} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`/api/image/${encodeURIComponent(mockRecipe.coverImageKey)}`),
                expect.any(Object)
            );
        });

        // Should create object URL for the image
        await waitFor(() => {
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });
    });

    it('shows placeholder when no image', () => {
        const { container } = render(<RecipeCard recipe={mockRecipeNoImage} onClick={vi.fn()} />);

        // Should show cooking emoji placeholder
        expect(container.textContent).toContain('🍳');
    });

    it('calls onClick when card is clicked', () => {
        const mockClick = vi.fn();

        const { container } = render(<RecipeCard recipe={mockRecipe} onClick={mockClick} />);

        const card = container.querySelector('[role="button"]');
        if (card) {
            card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }

        expect(mockClick).toHaveBeenCalled();
    });

    it('handles image fetch error gracefully', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
            } as Response)
        );

        const { container } = render(<RecipeCard recipe={mockRecipe} onClick={vi.fn()} />);

        await waitFor(() => {
            // Should show error icon
            expect(container.textContent).toContain('📸') || expect(container.querySelector('svg')).toBeTruthy();
        });
    });

    it('cleans up object URL on unmount', async () => {
        const { unmount } = render(<RecipeCard recipe={mockRecipe} onClick={vi.fn()} />);

        await waitFor(() => {
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        unmount();

        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
});
