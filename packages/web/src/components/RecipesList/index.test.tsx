import type { Recipe } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecipesList } from './index';

vi.mock('../RecipeCard', () => ({
    RecipeCard: ({ recipe, isOwner, onClick }: { recipe: Recipe; isOwner: boolean; onClick: () => void }) => (
        <button type="button" data-testid={`recipe-${recipe.id}`} data-owner={isOwner} onClick={onClick}>
            {recipe.title}
        </button>
    ),
}));

describe('RecipesList', () => {
    const recipes: Recipe[] = [
        { id: 'r1', title: 'Owned', ownerId: 'user-1', ingredients: [] },
        { id: 'r2', title: 'Shared', ownerId: 'user-2', ingredients: [] },
    ];

    it('passes isOwner=true for recipes owned by currentUserId', () => {
        render(<RecipesList recipes={recipes} currentUserId="user-1" onRecipeClick={vi.fn()} />);

        expect(screen.getByTestId('recipe-r1')).toHaveAttribute('data-owner', 'true');
    });

    it('passes isOwner=false for recipes not owned by currentUserId', () => {
        render(<RecipesList recipes={recipes} currentUserId="user-1" onRecipeClick={vi.fn()} />);

        expect(screen.getByTestId('recipe-r2')).toHaveAttribute('data-owner', 'false');
    });
});
