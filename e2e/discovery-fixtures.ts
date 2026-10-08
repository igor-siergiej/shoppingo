import type { DiscoveryRecipe } from '@shoppingo/types';

const wiki = (title: string) => `https://en.wikibooks.org/wiki/Cookbook:${title.replace(/ /g, '_')}`;

const library = (
    n: number,
    title: string,
    rest: Pick<DiscoveryRecipe, 'ingredients' | 'instructions' | 'tags'> & Partial<DiscoveryRecipe>
): DiscoveryRecipe => ({
    id: `e2e-library-${n}`,
    title,
    source: 'wikibooks',
    sourceUrl: wiki(title),
    licence: 'CC-BY-SA-4.0',
    attribution: `"${title}" from Wikibooks Cookbook, CC BY-SA 4.0 (${wiki(title)})`,
    sourceRevision: n,
    // Distinct, ordered timestamps: browsing (no query) sorts newest first.
    createdAt: new Date(Date.UTC(2026, 0, n)),
    updatedAt: new Date(Date.UTC(2026, 0, n)),
    ...rest,
});

const ing = (id: string, name: string, quantity?: number, unit?: string) => ({
    id,
    name,
    ...(quantity !== undefined && { quantity }),
    ...(unit !== undefined && { unit }),
});

/**
 * A small, fixed recipe library the Discover e2e tests search. Shape mirrors what the Wikibooks ingest writes:
 * `estimated` marks values the extractor filled in. Total time = prep + cook.
 */
export const DISCOVERY_FIXTURES: DiscoveryRecipe[] = [
    library(1, 'Lemon Drizzle Cake', {
        ingredients: [ing('a1', 'lemon', 2, 'pcs'), ing('a2', 'butter', 175, 'g'), ing('a3', 'caster sugar', 175, 'g')],
        instructions: ['Cream the butter and sugar.', 'Fold in the lemon zest and flour.', 'Bake, then drizzle.'],
        tags: ['cake', 'dessert', 'lemon'],
        prepTime: 15,
        cookTime: 40,
        servings: 8,
        difficulty: 'easy',
        estimated: ['prepTime'],
    }),
    library(2, 'Chocolate Brownies', {
        ingredients: [
            ing('b1', 'dark chocolate', 200, 'g'),
            ing('b2', 'butter', 150, 'g'),
            ing('b3', 'eggs', 3, 'pcs'),
        ],
        instructions: ['Melt the chocolate and butter.', 'Beat in the eggs.', 'Bake until set.'],
        tags: ['dessert', 'chocolate'],
        cookTime: 30,
        servings: 12,
        difficulty: 'medium',
        // The only fixture with a cover. Not among the recipes the visual baselines show, so they stay as they are.
        coverImageKey: 'discovery-image/e2e-library-2/1.jpg',
        coverImageAttribution: 'Photo: Jane Doe, CC BY 2.0, via Wikimedia Commons',
        coverImageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Chocolate_brownies.jpg',
    }),
    library(3, 'Aubergine Parmigiana', {
        ingredients: [
            ing('c1', 'aubergine', 2, 'pcs'),
            ing('c2', 'tomato passata', 500, 'ml'),
            ing('c3', 'mozzarella'),
        ],
        instructions: ['Fry the aubergine slices.', 'Layer with passata and mozzarella.', 'Bake until golden.'],
        tags: ['italian', 'vegetarian'],
        prepTime: 20,
        cookTime: 45,
        servings: 4,
        difficulty: 'medium',
    }),
    library(4, 'Quick Tomato Soup', {
        ingredients: [ing('d1', 'tomatoes', 6, 'pcs'), ing('d2', 'vegetable stock', 500, 'ml')],
        instructions: ['Simmer the tomatoes in the stock.', 'Blend until smooth.'],
        tags: ['soup', 'vegetarian'],
        cookTime: 10,
        servings: 2,
        difficulty: 'easy',
        estimated: ['servings'],
    }),
    library(5, 'Beef Wellington', {
        ingredients: [
            ing('e1', 'beef fillet', 800, 'g'),
            ing('e2', 'puff pastry', 500, 'g'),
            ing('e3', 'mushrooms', 400, 'g'),
        ],
        instructions: ['Sear the beef.', 'Wrap in mushroom duxelles and pastry.', 'Bake and rest.'],
        tags: ['beef', 'british'],
        prepTime: 60,
        cookTime: 60,
        servings: 6,
        difficulty: 'hard',
    }),
    library(6, 'Vanilla Sponge Cake', {
        ingredients: [
            ing('f1', 'butter', 200, 'g'),
            ing('f2', 'caster sugar', 200, 'g'),
            ing('f3', 'vanilla extract', 1, 'tsp'),
        ],
        instructions: ['Cream the butter and sugar.', 'Add eggs and vanilla.', 'Bake in two tins.'],
        tags: ['cake', 'dessert'],
        prepTime: 20,
        cookTime: 25,
        servings: 8,
        difficulty: 'easy',
    }),
];
