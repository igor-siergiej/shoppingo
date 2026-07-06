import type { RecipeImportResult } from '@shoppingo/types';

export interface PageFetcher {
    /** Fetch a URL and return its raw HTML body. Throws with a `status` field on failure. */
    fetchPage(url: string): Promise<string>;
}

/** A draft with string ingredient lines, before ids are assigned. */
export type RecipeDraft = Omit<RecipeImportResult, 'ingredients'> & { ingredients: string[] };

export interface RecipeTextExtractor {
    /** Extract a recipe draft from plain page text. Used as the Tier 3 LLM fallback. */
    extract(text: string): Promise<Pick<RecipeDraft, 'title' | 'ingredients' | 'instructions'>>;
}
