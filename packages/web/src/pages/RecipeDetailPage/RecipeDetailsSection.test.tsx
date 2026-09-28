import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecipeDetailsSection } from './RecipeDetailsSection';

describe('RecipeDetailsSection', () => {
    it('renders nothing for a non-owner viewer when no details are set', () => {
        const { container } = render(<RecipeDetailsSection isOwner={false} onSave={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows an "add details" affordance for the owner when nothing is set yet', () => {
        render(<RecipeDetailsSection isOwner onSave={vi.fn()} />);
        expect(screen.getByText('No details added yet.')).toBeInTheDocument();
        expect(screen.getByLabelText('Edit recipe details')).toBeInTheDocument();
    });

    it('shows chips for whichever fields are set', () => {
        render(
            <RecipeDetailsSection
                prepTime={20}
                cookTime={15}
                servings={4}
                difficulty="easy"
                isOwner={false}
                onSave={vi.fn()}
            />
        );
        expect(screen.getByText('Prep: 20 min')).toBeInTheDocument();
        expect(screen.getByText('Cook: 15 min')).toBeInTheDocument();
        expect(screen.getByText('Servings: 4')).toBeInTheDocument();
        expect(screen.getByText('Difficulty: Easy')).toBeInTheDocument();
    });

    it('hides the edit affordance for a non-owner', () => {
        render(<RecipeDetailsSection prepTime={20} isOwner={false} onSave={vi.fn()} />);
        expect(screen.queryByLabelText('Edit recipe details')).not.toBeInTheDocument();
    });

    it('opens the edit form prefilled with current values', async () => {
        render(
            <RecipeDetailsSection prepTime={20} cookTime={15} servings={4} difficulty="hard" isOwner onSave={vi.fn()} />
        );

        await userEvent.click(screen.getByLabelText('Edit recipe details'));

        expect(screen.getByLabelText('Prep time')).toHaveValue(20);
        expect(screen.getByLabelText('Cook time')).toHaveValue(15);
        expect(screen.getByLabelText('Servings')).toHaveValue(4);
    });

    it('saves edited values and exits edit mode', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(<RecipeDetailsSection isOwner onSave={onSave} />);

        await userEvent.click(screen.getByLabelText('Edit recipe details'));
        await userEvent.type(screen.getByLabelText('Prep time'), '10');
        await userEvent.type(screen.getByLabelText('Servings'), '2');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(onSave).toHaveBeenCalledWith({
            prepTime: 10,
            cookTime: undefined,
            servings: 2,
            difficulty: undefined,
        });
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    it('cancel discards edits without saving', async () => {
        const onSave = vi.fn();
        render(<RecipeDetailsSection prepTime={20} isOwner onSave={onSave} />);

        await userEvent.click(screen.getByLabelText('Edit recipe details'));
        await userEvent.clear(screen.getByLabelText('Prep time'));
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText('Prep: 20 min')).toBeInTheDocument();
    });
});
