# Discovery library: Wikibooks Cookbook ingest

Fills the `discoveryRecipes` library (see [discovery-search.md](./discovery-search.md)) from the English Wikibooks
Cookbook and keeps it in step with the wiki. Card 2 of 4 of the Discover feature.

```
bun run discover:ingest                 # full load first time, incremental refresh afterwards
bun run discover:ingest -- --limit 25   # trial run: at most 25 new or changed pages
bun run discover:validate               # counts + required-field check over the stored library
```

Needs `CONNECTION_URI`/`DATABASE_NAME`, `OPENSEARCH_URL` and `FAL_KEY` (tags and estimates). Exit code 0 = clean,
2 = some pages failed (re-run) or a removal was refused, 1 = bad configuration or validation failure.

## Licence

Wikibooks text is **CC BY-SA 4.0**. Every ingested recipe stores `licence: 'CC-BY-SA-4.0'`, `sourceUrl` (the wiki
page) and `attribution` (`"<title>" from Wikibooks Cookbook, CC BY-SA 4.0 (<page url>)`). The Discover UI must show
the attribution with every recipe, and a personal copy made from one keeps it. Rejected sources: RecipeNLG
(non-commercial research licence, scraped) and `recipe_nlg_lite` (MIT label over scraped data). Wikibooks/Commons
images have their own licences and are **not** copied, so ingested recipes have no cover image.

## How a run works

1. **List** every page in the Cookbook namespace (102) that transcludes `Template:Recipe`, with its current revision
   id (`generator=embeddedin` + `prop=revisions`, 500 pages per request). A listing that fails aborts the run before
   anything is written or removed.
2. **Diff** against `discoveryRecipes` (`source: 'wikibooks'`): a page whose revision equals the stored
   `sourceRevision` is skipped without a fetch, an LLM call or a write. This replaces `recentchanges`: it needs no
   state beyond the library itself and cannot miss an edit older than the recent-changes window.
3. **Fetch** wikitext for the new/changed pages, 50 per request, strictly serial.
4. **Build** each recipe (below), then write through `DiscoveryService.save` (Mongo, then OpenSearch).
5. **Prune** library recipes whose page is gone or is no longer a recipe. A run that would remove more than 20% of
   the library refuses and reports `removalsBlocked`: that is a broken listing, not a real change.

Recipes are keyed `wikibooks-<pageId>` (a rename keeps its page id), so re-running never duplicates. Pages are
processed in chunks of 50 and written as they finish, so an interrupted run keeps its progress.

A page that fails (rate limit, LLM error, bad data) is logged, counted in `failed`, **not** written, and its existing
copy is kept. It is retried by the next run because its stored revision still differs.

## Wikimedia API etiquette

`MediaWikiCookbookSource` sends a descriptive `User-Agent` with a contact address (`WIKIBOOKS_USER_AGENT` overrides
it), makes one request at a time with a 500 ms pause, sends `maxlag=5`, and backs off for `Retry-After` on 429, 5xx
and `maxlag`, giving up after 4 attempts. A full load is about 8 listing requests and ~80 content requests.

## Field mapping

| Library field | Source |
|---|---|
| `title` | page title without `Cookbook:` |
| `ingredients` | `*` lines of the `Ingredients` section, cleaned of wiki markup, parsed by `RuleIngredientStructurer` (the same structurer URL import uses) |
| `instructions` | `#` lines of `Procedure` (or `Procedures`/`Directions`/`Instructions`/`Method`/`Preparation`); hand-numbered `1.` lines accepted |
| `difficulty` | infobox `difficulty` (or `rating`): 1 → easy, 2-3 → medium, 4-5 → hard |
| `tags` | infobox category cleaned (`Dessert_recipes` → `dessert`) plus `FalRecipeTagger` output |
| `servings` | infobox `servings`: first number (the conservative end of a range) |
| `prepTime`/`cookTime` | infobox `time`. `Prep:` and cooking-type labels are split; a single or `Total:` value goes to `cookTime`; a range counts at its upper end |
| `estimated` | fields filled by `FalRecipeEstimator` because the source left them out |

Estimation rules: with no time at all, both `prepTime` and `cookTime` are estimated; with a single total, `cookTime`
is the source value and `prepTime` is left unset (estimating it would double count). The estimator is asked only for
the missing fields and anything it returns for other fields is discarded. Estimated fields are listed in `estimated`;
fields read from the source never are.

## What is not ingested

- Pages whose ingredients are a wikitable (the Baker's-percentage layout, ~90 pages) or that have no
  Ingredients/Procedure sections (index pages, templates, policy pages): skipped, counted in `skipped`.
- Cover images: none at ingest. Generating a fal.ai cover lazily on first view (rather than for all ~3.7k recipes
  up front) is a card 3 decision; this card makes no image calls.

## LLM cost

Two small `google/gemini-2.5-flash-lite` calls per recipe at most (tag, plus estimate when a field is missing, about
two thirds of recipes), roughly 700 input and 100 output tokens each, so a full load is on the order of 6-7k calls and
well under a few US dollars [INFERENCE from token counts, not a measured bill]. A refresh only pays for changed pages.
