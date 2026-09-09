import type { RecipeImportResult } from '@shoppingo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({
    importRecipeImage: vi.fn().mockRejectedValue(new Error('no image')),
}));

import { applyImportedDraft, type DraftSetters } from './applyImportedDraft';

const makeSetters = (): DraftSetters => ({
    setTitle: vi.fn(),
    setLink: vi.fn(),
    setIngredients: vi.fn(),
    setShowIngredientsPaste: vi.fn(),
    setSteps: vi.fn(),
    setShowPasteArea: vi.fn(),
    setSelectedFile: vi.fn(),
    setImageUrl: vi.fn(),
    setImportMeta: vi.fn(),
});

const draft: RecipeImportResult = {
    title: 'Cake',
    link: 'https://example.com/cake',
    instructions: ['Mix', 'Bake'],
    ingredients: [
        { id: '1', name: 'Butter', quantity: 4, unit: 'oz' },
        { id: '2', name: 'Salt' },
    ],
};

describe('applyImportedDraft unit conversion', () => {
    beforeEach(() => vi.clearAllMocks());

    it('leaves imported units untouched by default', async () => {
        const setters = makeSetters();
        await applyImportedDraft(draft, setters);

        expect(setters.setIngredients).toHaveBeenCalledWith([
            { name: 'Butter', quantity: 4, unit: 'oz' },
            { name: 'Salt', quantity: undefined, unit: undefined },
        ]);
    });

    it('converts convertible ingredients to the chosen system', async () => {
        const setters = makeSetters();
        await applyImportedDraft(draft, setters, 'metric');

        expect(setters.setIngredients).toHaveBeenCalledWith([
            { name: 'Butter', quantity: 113, unit: 'g' },
            { name: 'Salt', quantity: undefined, unit: undefined },
        ]);
    });
});
