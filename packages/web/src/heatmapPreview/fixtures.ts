import {
    type DiscoveryRecipe,
    type DiscoveryRecipeSummary,
    type DiscoverySearchResult,
    type Ingredient,
    type Item,
    type ItemCategory,
    isoDay,
    type Label,
    type ListResponse,
    ListType,
    type MealPlanEntry,
    type Recipe,
    type Todo,
    type User,
} from '@tandra/types';

// Placeholder data for the heatmap preview. Every piece of user content is a run of block glyphs, so the
// page keeps its real layout (row heights, wrapping, counts) while showing that the text is hidden.
// Nothing here comes from a real account: the visitor's data is never sent to analytics.

const BLOCK = '\u2587';

/** One blocked-out word per length, e.g. `hidden(5, 3)` reads like a two-word name. */
const hidden = (...wordLengths: number[]): string => wordLengths.map((n) => BLOCK.repeat(n)).join(' ');

const DAY_MS = 86_400_000;
const daysFromNow = (days: number): Date => new Date(Date.now() + days * DAY_MS);

export const previewUser: User = { id: 'preview-user', username: hidden(6) };
const friend: User = { id: 'preview-friend', username: hidden(5) };

const item = (index: number, name: string, category: ItemCategory, extra: Partial<Item> = {}): Item => ({
    id: `preview-item-${index}`,
    name,
    isSelected: false,
    dateAdded: daysFromNow(-index),
    category,
    ...extra,
});

const groceryItems: Item[] = [
    item(1, hidden(6), 'produce', { quantity: 6 }),
    item(2, hidden(4, 7), 'produce'),
    item(3, hidden(8), 'produce', { quantity: 500, unit: 'g' }),
    item(4, hidden(5), 'dairy', { quantity: 2, unit: 'l' }),
    item(5, hidden(6, 6), 'dairy'),
    item(6, hidden(5, 4), 'bakery'),
    item(7, hidden(7, 6), 'meat-fish', { quantity: 400, unit: 'g' }),
    item(8, hidden(5), 'frozen'),
    item(9, hidden(4, 5), 'pantry'),
    item(10, hidden(9), 'pantry', { quantity: 2 }),
    item(11, hidden(6, 5), 'drinks'),
    item(12, hidden(7, 6), 'household'),
    item(13, hidden(5), 'produce', { isSelected: true }),
    item(14, hidden(6, 4), 'pantry', { isSelected: true }),
];

const list = (index: number, title: string, items: Item[], users: User[]): ListResponse => ({
    id: `preview-list-${index}`,
    title,
    dateAdded: daysFromNow(-30 * index),
    items,
    users,
    listType: ListType.SHOPPING,
    ownerId: previewUser.id,
});

export const previewLists: ListResponse[] = [
    list(1, hidden(9), groceryItems, [previewUser, friend]),
    list(2, hidden(6, 4), groceryItems.slice(0, 5), [previewUser]),
    list(3, hidden(7), groceryItems.slice(5, 8), [previewUser, friend]),
    list(4, hidden(5, 6), [], [previewUser]),
];

/** Any list the dashboard asks for: the URL's title is the visitor's, so it is replaced too. */
export const previewList = (): ListResponse => previewLists[0];

const ingredient = (index: number, name: string, quantity?: number, unit?: string): Ingredient => ({
    id: `preview-ingredient-${index}`,
    name,
    ...(quantity !== undefined && { quantity }),
    ...(unit !== undefined && { unit }),
});

const ingredients: Ingredient[] = [
    ingredient(1, hidden(7), 400, 'g'),
    ingredient(2, hidden(5, 6), 2),
    ingredient(3, hidden(6), 1, 'tbsp'),
    ingredient(4, hidden(4, 8), 200, 'ml'),
    ingredient(5, hidden(8), 3),
    ingredient(6, hidden(5), 1, 'tsp'),
    ingredient(7, hidden(6, 5)),
    ingredient(8, hidden(9), 100, 'g'),
];

const instructions: string[] = [
    hidden(5, 3, 7, 4, 6, 2, 8, 5),
    hidden(4, 6, 3, 9, 5, 7, 2, 6, 4, 8, 3, 5),
    hidden(6, 4, 8, 3, 5),
    hidden(3, 7, 5, 6, 4, 9, 2, 5, 7, 3),
    hidden(5, 8, 4, 6, 3, 7),
];

const recipe = (index: number, title: string, extra: Partial<Recipe> = {}): Recipe => ({
    id: `preview-recipe-${index}`,
    title,
    ingredients,
    coverImageKey: `preview-cover-${index}`,
    users: [previewUser],
    ownerId: previewUser.id,
    dateAdded: daysFromNow(-7 * index),
    instructions,
    tags: [hidden(6), hidden(4)],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    difficulty: 'easy',
    ...extra,
});

export const previewRecipes: Recipe[] = [
    recipe(1, hidden(7, 5)),
    recipe(2, hidden(5, 3, 8), { difficulty: 'medium', cookTime: 45 }),
    recipe(3, hidden(9), { users: [previewUser, friend] }),
    recipe(4, hidden(6, 6, 4), { prepTime: 5, cookTime: 10 }),
    recipe(5, hidden(8, 5), { difficulty: 'hard', servings: 6 }),
    recipe(6, hidden(4, 7)),
    recipe(7, hidden(6, 9), { cookTime: 60 }),
    recipe(8, hidden(5, 5)),
];

/** Any recipe id the dashboard asks for gets a placeholder recipe under that id. */
export const previewRecipe = (id: string): Recipe => ({ ...previewRecipes[0], id });

const todo = (index: number, title: string, dueInDays: number, extra: Partial<Todo> = {}): Todo => ({
    id: `preview-todo-${index}`,
    ownerId: previewUser.id,
    title,
    done: false,
    dateAdded: daysFromNow(-3),
    dueDate: isoDay(daysFromNow(dueInDays)),
    ...extra,
});

export const previewLabels: Label[] = [
    { id: 'preview-label-1', ownerId: previewUser.id, name: hidden(4), color: '#3b82f6' },
    { id: 'preview-label-2', ownerId: previewUser.id, name: hidden(6), color: '#22c55e' },
];

export const previewTodos: Todo[] = [
    todo(1, hidden(6, 4), 0, { time: '09:00', labelId: 'preview-label-1' }),
    todo(2, hidden(8), 0),
    todo(3, hidden(5, 7), 1, { labelId: 'preview-label-2' }),
    todo(4, hidden(4, 6, 3), 2, { time: '18:30' }),
    todo(5, hidden(7), 4, { recurrence: { freq: 'weekly', interval: 1 } }),
    todo(6, hidden(6, 5), -1, { done: true }),
];

const mealPlan: MealPlanEntry[] = [-3, -1, 0, 1, 2].map((day, index) => ({
    id: `preview-meal-${index + 1}`,
    ownerId: previewUser.id,
    date: isoDay(daysFromNow(day)),
    recipeId: previewRecipes[index].id,
    servings: 2 + (index % 3),
    dateAdded: daysFromNow(-2),
}));

/** Entries inside the requested `YYYY-MM-DD` range, inclusive, as the api filters them. */
export const previewMealPlan = (from: string | null, to: string | null): MealPlanEntry[] =>
    mealPlan.filter((entry) => (!from || entry.date >= from) && (!to || entry.date <= to));

export const previewFriends: User[] = [friend, { id: 'preview-friend-2', username: hidden(7) }];

const discoverySummary = (recipe: Recipe): DiscoveryRecipeSummary => ({
    id: recipe.id.replace('recipe', 'discover'),
    title: recipe.title,
    tags: recipe.tags ?? [],
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    coverImageKey: recipe.coverImageKey,
    source: 'wikibooks',
});

const discoveryHits = previewRecipes.map(discoverySummary);

export const previewDiscoverySearch: DiscoverySearchResult = {
    hits: discoveryHits,
    total: discoveryHits.length,
    page: 1,
    pageSize: 20,
    facets: { tags: [], difficulty: [], source: [], ingredients: [], time: [] },
};

export const previewSimilarDiscovery: DiscoveryRecipeSummary[] = discoveryHits.slice(1, 5);

export const previewDiscoveryRecipe = (id: string): DiscoveryRecipe => ({
    ...discoveryHits[0],
    id,
    ingredients,
    instructions,
    sourceUrl: 'https://en.wikibooks.org/wiki/Cookbook',
    licence: 'CC-BY-SA-4.0',
    attribution: hidden(6, 4, 8),
    createdAt: daysFromNow(-90),
    updatedAt: daysFromNow(-90),
});

/** A flat grey tile for every item and cover image, so pictures read as blocked out too. */
export const PREVIEW_IMAGE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#9ca3af"/></svg>';
