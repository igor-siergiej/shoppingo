import type { DiscoveryEstimatedField, Ingredient, RecipeDifficulty } from '@shoppingo/types';

/** A recipe page as the wiki lists it: stable page id, current title and revision. */
export interface WikibooksPageRef {
    pageId: number;
    title: string;
    revisionId: number;
}

export interface WikibooksPage extends WikibooksPageRef {
    wikitext: string;
}

/** What the wiki says about one picture: where to fetch a web-sized copy and what its licence is. */
export interface WikibooksImageInfo {
    /** False when the wiki has no such file. */
    found: boolean;
    mime?: string;
    /** A web-sized rendition (at most 640px wide). */
    thumbUrl?: string;
    /** The file's own page (Commons or Wikibooks), where its author and licence are stated. */
    descriptionUrl?: string;
    /** Licence short name as the wiki states it, e.g. `CC BY-SA 4.0`; absent when the file has none. */
    licenceShortName?: string;
    /** Non-empty when the file carries legal restrictions beyond its licence (trademark, personality...). */
    restrictions?: string;
    artistHtml?: string;
}

/**
 * Read-only view of the Wikibooks Cookbook. Implementations identify themselves per Wikimedia API etiquette,
 * rate-limit themselves, and throw on a failed request rather than returning a partial listing.
 */
export interface WikibooksSource {
    /** Every Cookbook page that transcludes the recipe template, with its current revision. Throws if the listing is incomplete. */
    listRecipePages(): Promise<WikibooksPageRef[]>;
    /** Wikitext for the given pages. A page that could not be fetched is simply absent from the result. */
    fetchPages(refs: WikibooksPageRef[]): Promise<WikibooksPage[]>;
    /**
     * Metadata for picture file names, keyed by the name asked for. A name missing from the result means the lookup
     * itself failed (retry later); `found: false` means the wiki answered and has no such file.
     */
    fetchImageInfo(filenames: string[]): Promise<Map<string, WikibooksImageInfo>>;
    /** Downloads a picture. Throws on any failure. */
    downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }>;
}

/** Tags a recipe by what it is (cuisine, diet, key ingredient); satisfied by `FalRecipeTagger`. */
export interface RecipeTagger {
    generateTags(title: string, ingredients: Ingredient[], instructions?: string[]): Promise<string[]>;
}

export interface RecipeEstimate {
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: RecipeDifficulty;
}

/** Fills the numeric/difficulty fields a source did not state. Only the requested fields are used. */
export interface RecipeEstimator {
    estimate(
        recipe: { title: string; ingredients: Ingredient[]; instructions: string[] },
        fields: DiscoveryEstimatedField[]
    ): Promise<RecipeEstimate>;
}

/** What a run did, for the operator. `failed` pages are retried by simply running again. */
export interface IngestSummary {
    listed: number;
    unchanged: number;
    created: number;
    updated: number;
    removed: number;
    skipped: number;
    failed: number;
    /** Removals a run refused to make because they would delete an implausible share of the library. */
    removalsBlocked: number;
    /** Cover pictures stored this run. */
    covers: number;
    /** Pictures not used because their licence, type or file ruled them out. Final: they are not retried. */
    coversRefused: number;
    /** Pictures that could not be fetched or stored. Retried by the next run. */
    coversFailed: number;
}
