import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { suggestIngredientSubstitutes } from '../../api';
import { IngredientSubstitutesPopover } from './index';

vi.mock('../../api', () => ({
    suggestIngredientSubstitutes: vi.fn(),
}));

const mockSuggest = vi.mocked(suggestIngredientSubstitutes);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('IngredientSubstitutesPopover', () => {
    it('fetches and shows substitutes when opened', async () => {
        mockSuggest.mockResolvedValue({ substitutes: ['margarine', 'coconut oil'] });
        render(<IngredientSubstitutesPopover ingredientName="butter" recipeTitle="Carbonara" />);

        await userEvent.click(screen.getByLabelText('Suggest substitutes for butter'));

        expect(await screen.findByText('margarine')).toBeInTheDocument();
        expect(screen.getByText('coconut oil')).toBeInTheDocument();
        expect(mockSuggest).toHaveBeenCalledWith('butter', 'Carbonara');
    });

    it('shows a loading state while the request is in flight', async () => {
        const { promise, resolve: resolveRequest } = Promise.withResolvers<{ substitutes: string[] }>();
        mockSuggest.mockReturnValue(promise);
        render(<IngredientSubstitutesPopover ingredientName="butter" />);

        await userEvent.click(screen.getByLabelText('Suggest substitutes for butter'));

        expect(screen.getByText('Thinking…')).toBeInTheDocument();
        resolveRequest({ substitutes: [] });
        await waitFor(() => expect(screen.getByText('No substitutes found.')).toBeInTheDocument());
    });

    it('shows an error message when the request fails', async () => {
        mockSuggest.mockRejectedValue(new Error('Ingredient substitution is not configured'));
        render(<IngredientSubstitutesPopover ingredientName="butter" />);

        await userEvent.click(screen.getByLabelText('Suggest substitutes for butter'));

        expect(await screen.findByText('Ingredient substitution is not configured')).toBeInTheDocument();
    });

    it('only fetches once across repeated opens', async () => {
        mockSuggest.mockResolvedValue({ substitutes: ['margarine'] });
        render(<IngredientSubstitutesPopover ingredientName="butter" />);

        const trigger = screen.getByLabelText('Suggest substitutes for butter');
        await userEvent.click(trigger);
        await screen.findByText('margarine');
        await userEvent.click(trigger); // close
        await userEvent.click(trigger); // reopen

        expect(mockSuggest).toHaveBeenCalledTimes(1);
    });
});
