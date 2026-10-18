import type { Recipe } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '../../auth/accessTokenStore';
import { RecipeResultCard } from './index';

vi.mock('../../config/auth', () => ({ getAuthConfig: () => ({}) }));

const recipe = { id: 'r1', title: 'Pie', coverImageKey: 'recipe-upload/u1/r1/1.webp' } as Recipe;

describe('RecipeResultCard', () => {
    afterEach(() => setAccessToken(null));

    it('loads an uploaded cover with the bearer token and shows it', async () => {
        setAccessToken('token');
        const fetchMock = vi.fn(async () => new Response(new Blob(['img']), { status: 200 }));
        global.fetch = fetchMock as unknown as typeof fetch;
        URL.createObjectURL = vi.fn(() => 'blob:cover');
        URL.revokeObjectURL = vi.fn();

        render(<RecipeResultCard recipe={recipe} subtitle="2 ingredients" onClick={vi.fn()} />);

        expect(await screen.findByRole('img', { name: 'Pie' })).toHaveAttribute('src', 'blob:cover');
        expect(fetchMock).toHaveBeenCalledWith(`/api/image/${encodeURIComponent(recipe.coverImageKey as string)}`, {
            headers: { Authorization: 'Bearer token' },
        });
    });
});
