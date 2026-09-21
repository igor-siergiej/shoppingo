import type { RecipeImportResult } from '@shoppingo/types';
import { importRecipeImage } from '../../api';
import { convertIngredients, type UnitSystem } from '../../utils/convertUnits';
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

const applyIngredientsAndInstructions = (
    draft: RecipeImportResult,
    setters: DraftSetters,
    unitSystem: UnitSystem
): void => {
    if (draft.ingredients.length > 0) {
        const ingredients = draft.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit }));
        setters.setIngredients(convertIngredients(ingredients, unitSystem));
        setters.setShowIngredientsPaste(false);
    }
    if (draft.instructions.length > 0) {
        setters.setSteps(draft.instructions);
        setters.setShowPasteArea(false);
    }
};

export interface ApplyDraftOptions {
    signal?: AbortSignal;
    // Called just before the cover-image request starts, so callers can surface that
    // second leg — it only runs when the scrape actually found an image.
    onImageStart?: () => void;
}

// Resolves to undefined when the cover image couldn't be fetched for an ordinary reason
// (dead link, blocked host, proxy error) — that is a soft failure, since the rest of the
// import already succeeded and manual upload stays available. An aborted fetch is not:
// it propagates so a cancelled import is dropped instead of half-applied.
const fetchCoverImage = async (url: string, signal?: AbortSignal): Promise<File | undefined> => {
    try {
        return await importRecipeImage(url, signal);
    } catch (imageErr) {
        if (signal?.aborted) throw imageErr;

        logger.warn('Failed to auto-attach scraped recipe image', { error: String(imageErr) });
        return undefined;
    }
};

const applyScrapedImage = async (
    draft: RecipeImportResult,
    setters: DraftSetters,
    options: ApplyDraftOptions
): Promise<void> => {
    if (!draft.image) return;

    options.onImageStart?.();

    const file = await fetchCoverImage(draft.image, options.signal);
    if (!file) return;

    setters.setSelectedFile(file);
    setters.setImageUrl(URL.createObjectURL(file));
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
export const applyImportedDraft = async (
    draft: RecipeImportResult,
    setters: DraftSetters,
    unitSystem: UnitSystem = 'original',
    options: ApplyDraftOptions = {}
): Promise<void> => {
    applyBasicFields(draft, setters);
    applyIngredientsAndInstructions(draft, setters, unitSystem);
    await applyScrapedImage(draft, setters, options);
    applyImportMeta(draft, setters);
};
