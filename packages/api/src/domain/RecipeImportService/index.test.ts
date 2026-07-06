import { beforeEach, describe, expect, it } from 'bun:test';

import type { IdGenerator } from '../IdGenerator';
import { RecipeImportService } from './index';
import type { PageFetcher, RecipeTextExtractor } from './types';

class MockFetcher implements PageFetcher {
    html = '';
    calls: string[] = [];
    error: Error | null = null;

    async fetchPage(url: string): Promise<string> {
        this.calls.push(url);
        if (this.error) throw this.error;
        return this.html;
    }
}

class SequentialIdGenerator implements IdGenerator {
    private n = 0;
    generate(): string {
        this.n += 1;
        return `id-${this.n}`;
    }
}

const jsonLdPage = (ld: unknown, bodyExtra = ''): string =>
    `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>${bodyExtra}</body></html>`;

describe('RecipeImportService', () => {
    let fetcher: MockFetcher;
    let service: RecipeImportService;

    beforeEach(() => {
        fetcher = new MockFetcher();
        service = new RecipeImportService(fetcher, new SequentialIdGenerator());
    });

    describe('URL validation', () => {
        it('rejects a non-URL string', async () => {
            await expect(service.importFromUrl('not a url')).rejects.toMatchObject({ status: 400 });
        });

        it('rejects non-http protocols', async () => {
            await expect(service.importFromUrl('ftp://example.com/x')).rejects.toMatchObject({ status: 400 });
        });
    });

    describe('Tier 1 — JSON-LD', () => {
        it('parses a flat Recipe node', async () => {
            fetcher.html = jsonLdPage({
                '@context': 'https://schema.org',
                '@type': 'Recipe',
                name: 'Test Cake',
                image: 'https://img/cake.jpg',
                recipeIngredient: ['200g flour', '3 eggs', '100g sugar'],
                recipeInstructions: ['Mix.', 'Bake.'],
                prepTime: 'PT20M',
                recipeYield: '8 servings',
            });

            const result = await service.importFromUrl('https://example.com/cake');

            expect(result.title).toBe('Test Cake');
            expect(result.image).toBe('https://img/cake.jpg');
            expect(result.ingredients.map((i) => i.name)).toEqual(['200g flour', '3 eggs', '100g sugar']);
            expect(result.ingredients[0].id).toBe('id-1');
            expect(result.instructions).toEqual(['Mix.', 'Bake.']);
            expect(result.prepTime).toBe('PT20M');
            expect(result.recipeYield).toBe('8 servings');
            expect(result.link).toBe('https://example.com/cake');
        });

        it('finds a Recipe wrapped inside @graph', async () => {
            fetcher.html = jsonLdPage({
                '@context': 'https://schema.org',
                '@graph': [
                    { '@type': 'WebPage', name: 'Blog' },
                    {
                        '@type': 'Recipe',
                        name: 'Graph Stew',
                        recipeIngredient: ['carrots', 'potatoes'],
                        recipeInstructions: [{ '@type': 'HowToStep', text: 'Chop veg.' }],
                    },
                ],
            });

            const result = await service.importFromUrl('https://example.com/stew');

            expect(result.title).toBe('Graph Stew');
            expect(result.ingredients).toHaveLength(2);
            expect(result.instructions).toEqual(['Chop veg.']);
        });

        it('flattens HowToSection instructions', async () => {
            fetcher.html = jsonLdPage({
                '@type': 'Recipe',
                name: 'Sectioned',
                recipeIngredient: ['a', 'b'],
                recipeInstructions: [
                    {
                        '@type': 'HowToSection',
                        name: 'Prep',
                        itemListElement: [
                            { '@type': 'HowToStep', text: 'Wash.' },
                            { '@type': 'HowToStep', text: 'Peel.' },
                        ],
                    },
                    { '@type': 'HowToStep', text: 'Cook.' },
                ],
            });

            const result = await service.importFromUrl('https://example.com/x');

            expect(result.instructions).toEqual(['Wash.', 'Peel.', 'Cook.']);
        });

        it('handles @type as an array and image as an ImageObject array', async () => {
            fetcher.html = jsonLdPage({
                '@type': ['Recipe', 'NewsArticle'],
                name: 'Multi',
                image: [{ '@type': 'ImageObject', url: 'https://img/first.jpg' }],
                recipeIngredient: ['x', 'y'],
                recipeInstructions: 'Line one\nLine two',
            });

            const result = await service.importFromUrl('https://example.com/x');

            expect(result.image).toBe('https://img/first.jpg');
            expect(result.instructions).toEqual(['Line one', 'Line two']);
        });
    });

    describe('Tier 2 — HTML heuristics', () => {
        it('recovers ingredients/instructions from class-based markup (joshuaweissman shape)', async () => {
            fetcher.html = jsonLdPage(
                {
                    '@type': 'Recipe',
                    name: 'Kimchi',
                    image: 'https://img/kimchi.jpg',
                    prepTime: 'PT30M',
                },
                `<article class="ingredients-list"><ul>
                    <li>1 napa cabbage</li>
                    <li>1/2 cup salt</li>
                    <li>3 tbsp gochugaru</li>
                 </ul></article>
                 <div class="directions-list"><ol>
                    <li>Salt the cabbage.</li>
                    <li>Rinse and drain.</li>
                    <li>Mix with paste.</li>
                 </ol></div>`
            );

            const result = await service.importFromUrl('https://example.com/kimchi');

            expect(result.title).toBe('Kimchi');
            expect(result.image).toBe('https://img/kimchi.jpg');
            expect(result.ingredients.map((i) => i.name)).toEqual([
                '1 napa cabbage',
                '1/2 cup salt',
                '3 tbsp gochugaru',
            ]);
            expect(result.instructions).toEqual(['Salt the cabbage.', 'Rinse and drain.', 'Mix with paste.']);
        });

        it('parses microdata itemprop when no JSON-LD', async () => {
            fetcher.html = `<html><body>
                <span itemprop="recipeIngredient">2 cups rice</span>
                <span itemprop="recipeIngredient">4 cups water</span>
                <div itemprop="recipeInstructions">Boil rice in water.</div>
                <meta property="og:title" content="Plain Rice" />
            </body></html>`;

            const result = await service.importFromUrl('https://example.com/rice');

            expect(result.title).toBe('Plain Rice');
            expect(result.ingredients.map((i) => i.name)).toEqual(['2 cups rice', '4 cups water']);
            expect(result.instructions).toEqual(['Boil rice in water.']);
        });

        it('falls back to og:title/og:image when nothing else is found', async () => {
            fetcher.html = `<html><head>
                <meta property="og:title" content="Mystery Dish" />
                <meta property="og:image" content="https://img/mystery.jpg" />
            </head><body><p>no recipe markup</p></body></html>`;

            const result = await service.importFromUrl('https://example.com/mystery');

            expect(result.title).toBe('Mystery Dish');
            expect(result.image).toBe('https://img/mystery.jpg');
            expect(result.ingredients).toEqual([]);
            expect(result.instructions).toEqual([]);
        });

        it('keeps richer Tier 1 ingredients rather than overwriting with weaker Tier 2', async () => {
            fetcher.html = jsonLdPage(
                {
                    '@type': 'Recipe',
                    name: 'Rich',
                    recipeIngredient: ['flour', 'eggs', 'butter', 'sugar'],
                    // No instructions -> triggers Tier 2, but ingredients must survive.
                },
                `<div class="ingredient"><li>only one</li></div>
                 <div class="instructions"><ol><li>Step from html.</li></ol></div>`
            );

            const result = await service.importFromUrl('https://example.com/rich');

            expect(result.ingredients.map((i) => i.name)).toEqual(['flour', 'eggs', 'butter', 'sugar']);
            expect(result.instructions).toEqual(['Step from html.']);
        });
    });

    describe('Tier 3 — LLM fallback', () => {
        const llmPage = '<html><body><p>An unparseable recipe blog wall of text.</p></body></html>';

        it('uses the extractor when Tiers 1-2 are insufficient', async () => {
            const extractor: RecipeTextExtractor = {
                async extract() {
                    return {
                        title: 'LLM Dish',
                        ingredients: ['1 onion', '2 cloves garlic'],
                        instructions: ['Fry onion.', 'Add garlic.'],
                    };
                },
            };
            service = new RecipeImportService(fetcher, new SequentialIdGenerator(), undefined, extractor);
            fetcher.html = llmPage;

            const result = await service.importFromUrl('https://example.com/blog');

            expect(result.title).toBe('LLM Dish');
            expect(result.ingredients.map((i) => i.name)).toEqual(['1 onion', '2 cloves garlic']);
            expect(result.instructions).toEqual(['Fry onion.', 'Add garlic.']);
        });

        it('returns partial Tier 1-2 result when the LLM throws', async () => {
            const extractor: RecipeTextExtractor = {
                async extract() {
                    throw new Error('llm down');
                },
            };
            service = new RecipeImportService(fetcher, new SequentialIdGenerator(), undefined, extractor);
            fetcher.html = `<html><head><meta property="og:title" content="Partial" /></head><body></body></html>`;

            const result = await service.importFromUrl('https://example.com/partial');

            expect(result.title).toBe('Partial');
            expect(result.ingredients).toEqual([]);
        });

        it('does not call the extractor when Tiers 1-2 already succeed', async () => {
            let called = false;
            const extractor: RecipeTextExtractor = {
                async extract() {
                    called = true;
                    return { title: 'x', ingredients: [], instructions: [] };
                },
            };
            service = new RecipeImportService(fetcher, new SequentialIdGenerator(), undefined, extractor);
            fetcher.html = jsonLdPage({
                '@type': 'Recipe',
                name: 'Complete',
                recipeIngredient: ['rice', 'water'],
                recipeInstructions: ['Do it.'],
            });

            await service.importFromUrl('https://example.com/complete');

            expect(called).toBe(false);
        });
    });
});
