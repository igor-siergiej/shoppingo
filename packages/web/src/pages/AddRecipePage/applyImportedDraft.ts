import type { RecipeImportResult } from '@shoppingo/types';
import { importRecipeImage } from '../../api';
import { logger } from '../../utils/logger';
import type { Ingredient } from './IngredientsField';

export interface ImportMeta {
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string;
}

export interface DraftSetters {
    setTitle: (title: string) => void;
    setLink: (link: string) => void;
    setIngredients: (ingredients: Ingredient[]) => void;
    setShowIngredientsPaste: (show: boolean) => void;
    setSteps: (steps: string[]) => void;
    setShowPasteArea: (show: boolean) => void;
    setSelectedFile: (file: File | null) => void;
    setImageUrl: (url: string | null) => void;
    setImportMeta: (meta: ImportMeta) => void;
}

const applyBasicFields = (draft: RecipeImportResult, setters: DraftSetters): void => {
    if (draft.title) setters.setTitle(draft.title);
    if (draft.link) setters.setLink(draft.link);
};

const applyIngredientsAndInstructions = (draft: RecipeImportResult, setters: DraftSetters): void => {
    if (draft.ingredients.length > 0) {
        setters.setIngredients(draft.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit })));
        setters.setShowIngredientsPaste(false);
    }
    if (draft.instructions.length > 0) {
        setters.setSteps(draft.instructions);
        setters.setShowPasteArea(false);
    }
};

const applyScrapedImage = async (draft: RecipeImportResult, setters: DraftSetters): Promise<void> => {
    if (!draft.image) return;

    try {
        const file = await importRecipeImage(draft.image);
        setters.setSelectedFile(file);
        setters.setImageUrl(URL.createObjectURL(file));
    } catch (imageErr) {
        // Soft-fail: the scraped page's image couldn't be proxied (dead link, blocked host, etc).
        // The rest of the import already succeeded — leave manual upload available instead of
        // surfacing this as an import failure.
        logger.warn('Failed to auto-attach scraped recipe image', {
            error: imageErr instanceof Error ? imageErr.message : 'Unknown error',
        });
    }
};

const applyImportMeta = (draft: RecipeImportResult, setters: DraftSetters): void => {
    setters.setImportMeta({
        ...(draft.prepTime && { prepTime: draft.prepTime }),
        ...(draft.cookTime && { cookTime: draft.cookTime }),
        ...(draft.recipeYield && { recipeYield: draft.recipeYield }),
    });
};

// Applies a successfully-fetched recipe draft to form state. Only touches fields the
// draft actually found, leaving anything else the user may have already entered intact.
export const applyImportedDraft = async (draft: RecipeImportResult, setters: DraftSetters): Promise<void> => {
    applyBasicFields(draft, setters);
    applyIngredientsAndInstructions(draft, setters);
    await applyScrapedImage(draft, setters);
    applyImportMeta(draft, setters);
};
