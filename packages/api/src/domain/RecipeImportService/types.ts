import type { RecipeImportResult } from '@shoppingo/types';

import type { ParsedIngredient } from '../IngredientStructurer/types';

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

/** A recipe parsed directly out of a page's structured data by an LLM, ingredients already structured. */
export interface ParsedRecipe {
    title: string;
    ingredients: ParsedIngredient[];
    instructions: string[];
}

export interface RecipeParser {
    /** Parse a recipe from a JSON-LD document or plain page text. Throws with a `status` field on failure. */
    parse(source: string): Promise<ParsedRecipe>;
}
