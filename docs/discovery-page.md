# Discover page

Card 3 of 4 of the Discover feature: browse, search, preview and copy recipes from the shared library
(`discoveryRecipes`, see [discovery-search.md](./discovery-search.md) and [discovery-ingest.md](./discovery-ingest.md)).

## Routes

- `/discover`: search box (typo-tolerant, debounced), a Filters panel and ranked results with "Load more".
  Entry point: Recipes page, Actions menu, "Discover Recipes".
- `/discover/:recipeId`: full-page preview: ingredients, steps, meta, source attribution, a "similar recipes"
  strip and "Add to my recipes".

Both are full pages, like Waste Warrior, so results are never squashed behind the keyboard.

## Filters

Four facet groups, all built from the aggregation counts the search API returns for the current result set:
difficulty, total time, tags and ingredients. Facet counts shrink as filters apply; a time range with no recipes is
not offered; a selected value stays visible so it can always be unselected. A time chip maps its half-open bucket
`[from, to)` to the API's inclusive `minTime`/`maxTime`. Filters are sent as repeated query parameters
(`ingredients=a&ingredients=b`), never comma-joined, because ingredient names contain commas ("onion, chopped").

## Estimated values

A value the ingest estimated (`estimated` on the recipe) is shown with a leading `≈` (`≈15m prep`) on cards and in the
preview, with a legend on the preview. Values read from the source are never marked.

## Add to my recipes

`POST /api/discover/recipes/:id/copy` creates a normal personal recipe through `RecipeService.createRecipe`, so
ownership and `users` scoping are those of any recipe the user creates (`DiscoveryCopyService`).

- **Private.** The copy is created with an explicit empty share list; the default would share it with every friend.
- **Attribution.** The copy keeps the source page as `link` and the licence text in a new `attribution` field, shown on
  the recipe detail page. CC BY-SA requires it to stay with the text.
- **No duplicates.** A user who already has a recipe whose `link` is the library recipe's `sourceUrl` gets a 409 and the
  preview shows "Already in your recipes" with a link to it. The same match catches a URL import of the same page.
- **Covers.** The library's `coverImageKey` is never copied or referenced: a key owned by the library can be deleted by
  an unpublish or refresh. Wikibooks recipes have no cover, so the copy gets the normal generated cover. When
  user-published recipes bring library covers (card 4), the copy must write them to the user's own key.

## When OpenSearch is down

Search and similar-recipes answer 503 (card 1). The Discover page shows an "unavailable" state with Retry and nothing
else in the app is affected. Opening a recipe and copying it read Mongo only, so they keep working.
