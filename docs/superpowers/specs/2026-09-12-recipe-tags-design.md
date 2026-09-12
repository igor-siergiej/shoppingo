# Recipe Tags: Manual Entry + AI-Generated Suggestions

**Date:** 2026-09-12
**Status:** Approved, pending implementation

## Problem

Recipes have no tags/category concept. Search (`useRecipeSearch`, Fuse.js over
`['title', 'ingredients.name']`) only matches literal words in the title or an ingredient's
`name` field, so craving-based search ("show me beef recipes") misses any recipe whose name
doesn't contain the word — e.g. "Bourguignon" for beef, or a dish where the defining
ingredient isn't in the title at all. There is no existing tag/category field on `Recipe`
anywhere in the codebase; the only related concept is Todos' unrelated `Label` model
(`ownerId, name, color`).

Recipe import already calls fal.ai's cheap `any-llm` model (`google/gemini-2.5-flash-lite`,
via the shared `FalLlmClient`) to structure recipe text from a URL. The same cheap-model
infrastructure can generate a recipe's defining tags with no new client or model needed.

## Goals

1. `Recipe` gets a `tags: string[]` field, editable by the owner (add/remove).
2. User can type tags manually when creating a recipe (free text, no fixed vocabulary).
3. An AI tag-suggestion pass always runs once at creation — regardless of whether manual
   tags were entered — using the same cheap fal.ai model as recipe-URL import. It extracts
   the core defining tags of the dish (protein, dish type, cuisine, texture), not just words
   already present in the title/ingredients.
4. AI tags merge into the manual list, case-insensitive exact-match dedupe, no duplicates.
5. Tags are individually deletable from the Recipe Detail page.
6. Recipes search combines free-text search (now matching tags too) with an exact tag-chip
   filter; both narrow the result set together.

## Non-goals

- A fixed/curated tag vocabulary. Tags stay open-ended free text; the AI is not asked to
  reuse existing tags (explicit choice over an autocomplete-from-pool approach).
- Re-running AI tagging on a later edit. Fires once, at creation, per decision.
- Tag management tooling: rename/merge, tag clouds, analytics, a dedicated tags page.
- Adding tags to the import draft (`RecipeImportResult`) — tags only exist once a recipe is
  actually created, after the user has reviewed/confirmed the form.
- Any change to the three-tier import/extraction flow, the AI cover-image feature, or the
  offline-outbox transport itself beyond adding a `tags` payload field.

## Design

### Data model

`packages/types/src/index.ts` — add `tags?: string[]` to `Recipe` (`index.ts:66-78`) and to
`RecipeResponse` (`index.ts:80-91`). Values are trimmed, lowercased, deduped before storage.
`undefined` and `[]` both mean "no tags" (render nothing, not an empty chip row).

### FalRecipeTagger (infrastructure)

New `packages/api/src/infrastructure/FalRecipeTagger/index.ts`, structurally identical to
`FalRecipeExtractor` — built on the shared `FalLlmClient`, no new model or config key (reuses
the client's default model / `recipeImportLlmModel` override, same as every other fal
consumer).

```ts
export interface FalRecipeTaggerOptions {
    model?: string;
    timeoutMs?: number;
}

const SYSTEM_PROMPT =
    'You extract the core defining tags of a recipe/dish, for search by craving rather than ' +
    'by name. Given a title, ingredient list and instructions, return the 4-8 tags a person ' +
    'would use to find this dish even if they forgot its name (protein, cuisine, dish type, ' +
    'key ingredient, texture/style — e.g. carbonara: pasta, egg, cheese, pork, creamy). Reply ' +
    'with ONLY a compact JSON object {"tags": string[]}. Lowercase, single words or short ' +
    'phrases, no duplicates, no punctuation.';

export class FalRecipeTagger {
    constructor(
        private readonly client: FalLlmClient,
        options: FalRecipeTaggerOptions = {}
    ) { /* stores options.model / options.timeoutMs, same pattern as FalRecipeExtractor */ }

    async generateTags(title: string, ingredients: Ingredient[], instructions?: string[]): Promise<string[]> {
        const { value } = await this.client.completeStructured({
            operation: 'recipe.tag',
            schema: taggedRecipeSchema, // z.object({ tags: z.array(z.string()).catch([]) })
            system: SYSTEM_PROMPT,
            prompt:
                `Title: ${title}\n` +
                `Ingredients: ${ingredients.map((i) => i.name).join(', ')}\n` +
                `Instructions: ${(instructions ?? []).join(' ')}`,
            ...(this.model !== undefined && { model: this.model }),
            ...(this.timeoutMs !== undefined && { timeoutMs: this.timeoutMs }),
        });
        return value.tags;
    }
}
```

Failure is non-fatal by contract: the caller (`RecipeService.createRecipe`) catches and falls
back to `[]`, so a fal.ai hiccup never blocks creating the recipe — the user still gets their
manually-entered tags (or none).

### RecipeService.createRecipe

`packages/api/src/domain/RecipeService/index.ts:68` — new optional constructor param
`tagger?: FalRecipeTagger` (mirrors the existing optional `recipeImageService`), and a new
optional `tags?: string[]` argument on `createRecipe`.

```ts
const normalize = (t: string) => t.trim().toLowerCase();
const manual = (tags ?? []).map(normalize).filter(Boolean);

let aiTags: string[] = [];
if (this.tagger) {
    try {
        aiTags = (await this.tagger.generateTags(title, ingredients, instructions)).map(normalize).filter(Boolean);
    } catch (error) {
        this.logger?.warn('Recipe tag generation failed, continuing without AI tags', { recipeTitle: title, error });
    }
}

const seen = new Set(manual);
const mergedTags = [...manual, ...aiTags.filter((t) => !seen.has(t) && (seen.add(t), true))];
```

`mergedTags` is stored on `recipe.tags` (omit the field entirely if empty, matching the
`link`/`instructions` optional-spread convention already in this method).

### Tag deletion

No new endpoint. `updateRecipe` (`RecipeService/index.ts:131`, handler
`RecipeHandlers/index.ts:223`) gains a `tags?: string[]` param, following the exact pattern
already used for `link`/`instructions`. Deleting a tag on the Recipe Detail page just resends
the full recipe with that one tag removed from the array via the existing
`PUT /api/recipes/:recipeId` full-update path — no dedicated tag-delete route needed.

### Offline outbox

`packages/web/src/offline/intents.ts:157` (`applyRecipeIntent`) — both `recipe.create` and
`recipe.update` cases gain `...(p.tags !== undefined && { tags: p.tags as string[] })`,
identical in shape to the existing `instructions` spread immediately above each.

AI-generated tags are computed server-side and are not known to the client at intent-creation
time, so the optimistic local recipe carries only the manually-entered tags until the outbox
drains and the server's response (or the next query refetch) fills in the merged set. This
mirrors the existing latency for other server-computed fields (e.g. `aiImageKey`).

`useRecipeMutations.ts` — `createRecipe` (`:36`) and `updateRecipe` (`:58`) each gain a
`tags?: string[]` parameter, passed straight through into the `enqueueRecipe` payload.

### DI wiring

`packages/api/src/dependencies/index.ts` — register `DependencyToken.FalRecipeTagger`
alongside the existing `FalRecipeExtractor`/`FalRecipeParser` registrations (same
`registerSingleton` + `FalLlmClient`-resolving-factory pattern), and add it as an extra
resolved constructor arg on the `RecipeService` singleton factory (`:129-140`).
`packages/api/src/dependencies/types.ts` gets the new token.

### Frontend: create form

New `packages/web/src/pages/AddRecipePage/TagsField.tsx`, structurally parallel to
`IngredientsField.tsx` but simpler: a single text input where Enter or comma commits the
current text as a removable chip (trim; skip if it case-insensitively duplicates an existing
chip). `AddRecipePage/index.tsx` gets a `tags: string[]` state entry alongside
`steps`/`ingredients` (`:68-85`), rendered under the Ingredients field (`:315`), included in
the `createRecipe(...)` call on submit.

### Frontend: view/edit

`RecipeDetailPage/index.tsx` gets a new `TagsSection.tsx` (parallel to
`IngredientsSection.tsx`): a chip row, each chip with a delete (×) that calls
`updateRecipe(recipeId, recipe.title, recipe.ingredients, undefined, recipe.link, recipe.instructions, nextTags)`
where `nextTags` is `recipe.tags` with the removed one filtered out.

### Search

`useRecipeSearch.ts:11` — `keys: ['title', 'ingredients.name', 'tags']`, so the existing
fuzzy text search also matches tags.

`RecipesPage/index.tsx` gets a new `selectedTags: string[]` state and a tag-chip filter row
rendered under the search bar (near `:106`), built from the distinct tag set across `recipes`
(deduped, sorted). Clicking a chip toggles membership in `selectedTags`.

```ts
const textFiltered = useRecipeSearch(recipes, searchQuery);
const filtered = selectedTags.length === 0
    ? textFiltered
    : textFiltered.filter((r) => selectedTags.every((t) => r.tags?.includes(t)));
```

Free-text search (now including tags) and the exact tag-chip filter combine — the chip row
narrows further within whatever the search box already matched, rather than either replacing
the other.

## Testing

Bun native test runner (`bun:test`), per project convention.

- `FalRecipeTagger` — fake `FalLlmClient`, asserting `operation`/`schema` passed, tag-list
  passthrough, `.catch([])` tolerance on malformed model output. Mirrors
  `FalRecipeExtractor.test.ts`.
- `RecipeService.createRecipe` — manual-only tags (tagger still called, AI tags merged);
  overlapping manual+AI tags dedupe case-insensitively; tagger throws → recipe still created
  with manual tags only; no tagger configured (optional dep) → recipe created, no crash.
- `RecipeService.updateRecipe` — tags passthrough and removal.
- `applyRecipeIntent` — `tags` flows through `recipe.create`/`recipe.update`.
- `useRecipeSearch` — tag match added to existing fixture tests.
- Web component tests: `TagsField` (add/dedupe/remove), `RecipesPage` chip+search combined
  narrowing.
- Playwright e2e: create a recipe with a manual tag that overlaps an AI-suggested one (no
  duplicate chip); delete a tag from Recipe Detail; search narrows correctly when both a
  text query and a tag chip are active together.

## Files

**New**
- `packages/api/src/infrastructure/FalRecipeTagger/index.ts` + `schema.ts` + `index.test.ts`
- `packages/web/src/pages/AddRecipePage/TagsField.tsx` (+ test)
- `packages/web/src/pages/RecipeDetailPage/TagsSection.tsx` (+ test)

**Modified**
- `packages/types/src/index.ts` — `tags?: string[]` on `Recipe`, `RecipeResponse`
- `packages/api/src/domain/RecipeService/index.ts` — tagger dep, merge logic, `tags` param
- `packages/api/src/interfaces/RecipeHandlers/index.ts` — `tags` passthrough create/update
- `packages/api/src/dependencies/index.ts` — register `FalRecipeTagger`, wire into `RecipeService`
- `packages/api/src/dependencies/types.ts` — new `FalRecipeTagger` token
- `packages/web/src/hooks/useRecipeMutations.ts` — `tags` param on create/update
- `packages/web/src/offline/intents.ts` — `tags` in `applyRecipeIntent`
- `packages/web/src/hooks/useRecipeSearch.ts` — `tags` in Fuse `keys`
- `packages/web/src/pages/AddRecipePage/index.tsx` — tags state + field
- `packages/web/src/pages/RecipeDetailPage/index.tsx` — tags section
- `packages/web/src/pages/RecipesPage/index.tsx` — chip filter row + combined narrowing

## Follow-ups

- Tag autocomplete from the existing pool — explicitly deferred in favor of open-ended AI tags.
- A "regenerate tags" action for existing recipes — deferred per the creation-only decision.
- Tag rename/merge tooling, if drift between near-duplicate tags becomes a real problem.
