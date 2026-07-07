import type { Logger } from '@imapps/api-utils';
import type { Ingredient, RecipeImportResult } from '@shoppingo/types';
import * as cheerio from 'cheerio';

import type { IdGenerator } from '../IdGenerator';
import type { PageFetcher, RecipeDraft, RecipeTextExtractor } from './types';

const MIN_INGREDIENTS = 2;
const MAX_ITEMS = 100;
const LLM_TEXT_LIMIT = 6000;

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();

const cleanList = (values: Array<string | undefined | null>): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of values) {
        if (typeof raw !== 'string') continue;
        const value = collapse(raw);
        if (value.length < 2 || value.length > 500) continue;
        if (seen.has(value)) continue;
        seen.add(value);
        out.push(value);
        if (out.length >= MAX_ITEMS) break;
    }
    return out;
};

export class RecipeImportService {
    constructor(
        private readonly fetcher: PageFetcher,
        private readonly idGenerator: IdGenerator,
        private readonly logger?: Logger,
        private readonly llmExtractor?: RecipeTextExtractor
    ) {}

    // Invoked via the DI container (getRecipeImportService().importFromUrl); fallow can't trace that indirection.
    // fallow-ignore-next-line unused-class-member
    async importFromUrl(url: string): Promise<RecipeImportResult> {
        const parsed = this.parseUrl(url);
        const html = await this.fetcher.fetchPage(parsed);

        const draft: RecipeDraft = {
            title: '',
            ingredients: [],
            instructions: [],
            link: parsed,
        };

        // Tier 1 — structured JSON-LD (free, most reliable when present).
        this.mergeDraft(draft, this.parseJsonLd(html));

        // Tier 2 — HTML heuristics, only when Tier 1 came up short.
        if (this.isInsufficient(draft)) {
            this.mergeDraft(draft, this.parseHtml(html));
        }

        // Tier 3 — LLM fallback, only when still short and explicitly enabled/wired.
        if (this.isInsufficient(draft) && this.llmExtractor) {
            await this.tryLlm(draft, html);
        }

        return {
            title: draft.title,
            ingredients: draft.ingredients.map<Ingredient>((name) => ({ id: this.idGenerator.generate(), name })),
            instructions: draft.instructions,
            link: draft.link,
            ...(draft.image !== undefined && { image: draft.image }),
            ...(draft.prepTime !== undefined && { prepTime: draft.prepTime }),
            ...(draft.cookTime !== undefined && { cookTime: draft.cookTime }),
            ...(draft.recipeYield !== undefined && { recipeYield: draft.recipeYield }),
        };
    }

    private parseUrl(url: string): string {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            throw Object.assign(new Error('Invalid URL'), { status: 400 });
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw Object.assign(new Error('URL must be http or https'), { status: 400 });
        }
        return parsed.toString();
    }

    private isInsufficient(draft: RecipeDraft): boolean {
        return draft.ingredients.length < MIN_INGREDIENTS || draft.instructions.length === 0;
    }

    // Fill only what's still missing/weaker, so cheaper tiers win when they already succeeded.
    private mergeDraft(draft: RecipeDraft, next: Partial<RecipeDraft>): void {
        if (!draft.title && next.title) draft.title = next.title;
        if (next.ingredients && next.ingredients.length > draft.ingredients.length) {
            draft.ingredients = next.ingredients;
        }
        if (next.instructions && next.instructions.length > draft.instructions.length) {
            draft.instructions = next.instructions;
        }
        if (!draft.image && next.image) draft.image = next.image;
        if (!draft.prepTime && next.prepTime) draft.prepTime = next.prepTime;
        if (!draft.cookTime && next.cookTime) draft.cookTime = next.cookTime;
        if (!draft.recipeYield && next.recipeYield) draft.recipeYield = next.recipeYield;
    }

    private parseJsonLd(html: string): Partial<RecipeDraft> {
        const $ = cheerio.load(html);
        const blocks = $('script[type="application/ld+json"]').toArray();

        for (const block of blocks) {
            const raw = $(block).text();
            if (!raw.trim()) continue;

            let parsed: unknown;
            try {
                parsed = JSON.parse(raw);
            } catch {
                continue;
            }

            const recipe = this.findRecipeNode(parsed);
            if (recipe) {
                return this.draftFromRecipeNode(recipe);
            }
        }
        return {};
    }

    // JSON-LD may be a single object, an array of nodes, or wrap nodes in a top-level @graph.
    private findRecipeNode(node: unknown): Record<string, unknown> | null {
        if (Array.isArray(node)) {
            for (const item of node) {
                const found = this.findRecipeNode(item);
                if (found) return found;
            }
            return null;
        }
        if (!node || typeof node !== 'object') return null;

        const obj = node as Record<string, unknown>;
        if (Array.isArray(obj['@graph'])) {
            const found = this.findRecipeNode(obj['@graph']);
            if (found) return found;
        }

        const type = obj['@type'];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => typeof t === 'string' && t.toLowerCase() === 'recipe')) {
            return obj;
        }
        return null;
    }

    private draftFromRecipeNode(recipe: Record<string, unknown>): Partial<RecipeDraft> {
        const draft: Partial<RecipeDraft> = {};

        const name = recipe.name ?? recipe.headline;
        if (typeof name === 'string' && collapse(name)) draft.title = collapse(name);

        const ingredients = cleanList(this.toStringArray(recipe.recipeIngredient));
        if (ingredients.length) draft.ingredients = ingredients;

        const instructions = cleanList(this.flattenInstructions(recipe.recipeInstructions));
        if (instructions.length) draft.instructions = instructions;

        const image = this.extractImage(recipe.image);
        if (image) draft.image = image;

        for (const [field, key] of [
            ['prepTime', 'prepTime'],
            ['cookTime', 'cookTime'],
            ['recipeYield', 'recipeYield'],
        ] as const) {
            const value = recipe[key];
            if (typeof value === 'string' && value.trim()) draft[field] = value.trim();
            else if (Array.isArray(value) && typeof value[0] === 'string') draft[field] = value[0].trim();
        }

        return draft;
    }

    private toStringArray(value: unknown): string[] {
        if (typeof value === 'string') return [value];
        if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
        return [];
    }

    // recipeInstructions may be a string, string[], HowToStep[], or HowToSection[] (with nested steps).
    private flattenInstructions(value: unknown): string[] {
        if (!value) return [];
        if (typeof value === 'string') {
            return value.split('\n');
        }
        if (Array.isArray(value)) {
            return value.flatMap((item) => this.flattenInstructions(item));
        }
        if (typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            const type = typeof obj['@type'] === 'string' ? (obj['@type'] as string).toLowerCase() : '';
            if (type === 'howtosection' || Array.isArray(obj.itemListElement)) {
                return this.flattenInstructions(obj.itemListElement);
            }
            if (typeof obj.text === 'string') return [obj.text];
            if (typeof obj.name === 'string') return [obj.name];
        }
        return [];
    }

    private extractImage(value: unknown): string | undefined {
        if (!value) return undefined;
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = this.extractImage(item);
                if (found) return found;
            }
            return undefined;
        }
        if (typeof value === 'object') {
            const url = (value as Record<string, unknown>).url;
            if (typeof url === 'string') return url;
        }
        return undefined;
    }

    private parseHtml(html: string): Partial<RecipeDraft> {
        const $ = cheerio.load(html);
        const draft: Partial<RecipeDraft> = {};

        // Ingredients: microdata first, then class/id substring heuristic.
        let ingredients = cleanList(
            $('[itemprop="recipeIngredient"], [itemprop="ingredients"]')
                .toArray()
                .map((el) => $(el).text())
        );
        if (ingredients.length < MIN_INGREDIENTS) {
            ingredients = cleanList(
                $('[class*="ingredient" i] li, [id*="ingredient" i] li')
                    .toArray()
                    .map((el) => $(el).text())
            );
        }
        if (ingredients.length) draft.ingredients = ingredients;

        // Instructions: microdata first, then ordered-list items inside instruction/direction/step containers.
        let instructions = cleanList(
            $('[itemprop="recipeInstructions"]')
                .toArray()
                .map((el) => $(el).text())
        );
        if (instructions.length < 1) {
            instructions = cleanList(
                $(
                    '[class*="instruction" i] ol li, [id*="instruction" i] ol li, [class*="direction" i] ol li, [id*="direction" i] ol li, [class*="step" i] ol li, [id*="step" i] ol li'
                )
                    .toArray()
                    .map((el) => $(el).text())
            );
        }
        if (instructions.length) draft.instructions = instructions;

        const title = $('meta[property="og:title"]').attr('content') ?? $('title').first().text();
        if (title && collapse(title)) draft.title = collapse(title);

        const image = $('meta[property="og:image"]').attr('content');
        if (image) draft.image = image;

        return draft;
    }

    private async tryLlm(draft: RecipeDraft, html: string): Promise<void> {
        try {
            const text = this.htmlToText(html).slice(0, LLM_TEXT_LIMIT);
            const extracted = await this.llmExtractor?.extract(text);
            if (!extracted) return;
            this.mergeDraft(draft, {
                title: extracted.title ? collapse(extracted.title) : undefined,
                ingredients: cleanList(extracted.ingredients ?? []),
                instructions: cleanList(extracted.instructions ?? []),
            });
        } catch (error) {
            // Tier 3 is best-effort: never fail the whole import on an LLM error.
            this.logger?.warn('Recipe import LLM fallback failed', { error: (error as Error)?.message });
        }
    }

    private htmlToText(html: string): string {
        const $ = cheerio.load(html);
        $('script, style, nav, header, footer, noscript, svg').remove();
        return collapse($('body').text() || $.root().text());
    }
}
