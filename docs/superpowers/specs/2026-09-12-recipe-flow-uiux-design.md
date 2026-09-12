# Recipe Flow UI/UX Rework: Sectioned Add Recipe, Hero-Image View Recipe

**Date:** 2026-09-12
**Status:** Approved, pending implementation

## Problem

Recipe entry and viewing were built up incrementally (manual add, URL import, AI cover image,
share-target, tags) and it shows on mobile:

- Add Recipe (`AddRecipePage/index.tsx`) is one long unstructured scroll — title, image, link,
  ingredients, instructions, tags and sharing all run together with no visual grouping, and
  buttons/remove-icons are small for a touch target.
- Recipe Detail (`RecipeDetailPage/index.tsx`)'s header crams a `truncate`d single-line title next
  to edit/delete icons (`:262` `<h1 className="text-xl font-semibold truncate flex-1">`) — long
  titles clip and are unreadable.
- The three ways a recipe reaches Add Recipe (manual entry, "import from URL", and the PWA
  `share_target` receiving a shared link) already converge on one form via
  `AddRecipePage`'s `sharedUrl` query param + `autoImport` — confirmed by reading
  `ShareTargetPage`, `RecipesPage`'s `sharedUrl` redirect, and `AddRecipePage`'s `initialLink`/
  `autoImport` logic. There is no second/third form to unify; this is a **visual redesign of the
  existing single flow**, not new plumbing.

## Goals

1. Add Recipe: group fields into clearly labeled sections (Photo, Basics, Ingredients,
   Instructions, Tags, Share) with more spacing and larger tap targets, on the same single-scroll
   page and the same entry logic as today.
2. Recipe Detail: full-width cover photo with the title wrapping (not truncating) below it, and
   edit/delete/link actions moved into an icon row under the title instead of squeezed inline
   beside it.
3. No regressions to manual add, URL import, AI-import, or share-target — all keep landing on the
   same form and behaving identically.

## Non-goals

- No wizard/multi-step flow (rejected in favor of sectioned single-scroll — see Design options
  reviewed).
- No new backend endpoints, DB fields, or data model changes — this is presentational only.
- No change to ingredient/step *editing capability* (paste-vs-list toggle, add/remove) — only its
  visual container and tap-target sizing.
- No change to the AI cover-image generation, upload, or offline-outbox behavior.
- Desktop layout is out of scope; the app is used PWA/mobile-first (per `CLAUDE.md`) and this pass
  targets that.

## Design options reviewed

Presented as mockups to the user (visual companion), who picked option A for both pages:

- **Add Recipe** — (A) sectioned cards *(chosen)* vs. (B) step-by-step wizard vs. (C) single
  scroll + sticky jump-nav. B adds a new multi-step interaction pattern and slows down re-entering
  a familiar recipe; C adds UI chrome to an already-short form. A is the least disruptive change.
- **Recipe Detail** — (A) hero image + wrapping title *(chosen)* vs. (B) compact header + overflow
  menu vs. (C) full-bleed image with gradient-overlay title. B hides edit/delete an extra tap deep;
  C risks title/photo contrast issues. A directly fixes the clipping bug with no new chrome.

## Design

### Add Recipe: `FormSection`

New `packages/web/src/pages/AddRecipePage/FormSection.tsx` — a small presentational wrapper,
parallel in spirit to the existing `IngredientsField`/`TagsField` pattern:

```tsx
export interface FormSectionProps {
    title: string;
    children: ReactNode;
}

export const FormSection = ({ title, children }: FormSectionProps) => (
    <section className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {children}
    </section>
);
```

`AddRecipePage/index.tsx`'s form-mode JSX (`:270-365` today) is restructured to wrap each existing
group in a `FormSection`:

- **Photo** — `ImageUploadField`
- **Basics** — recipe title `Input`, `LinkImportField`
- **Ingredients** — `IngredientsField`
- **Instructions** — the paste/list toggle block (currently inline JSX)
- **Tags** — `TagsField` (from the `feat/recipe-tags` branch this stacks on)
- **Share** — `FriendPicker`

No prop or handler changes to any of these children — this is a JSX reorganization plus a spacing/
sizing pass (larger `Input`/`Textarea` height, larger `RemoveRowButton`/`AddRowButton` hit areas
via padding, not new components — see `components/StepsList/ListRowButtons.tsx`). The
`ChoiceScreen`, `ImportScreen`, and the `autoImport`/`handleImport` logic are untouched.

### Recipe Detail: hero header

`RecipeDetailPage/index.tsx`'s header block (`:245-296` today, the title/link/edit/delete row) is
restructured:

1. `CoverImageSection` moves to the very top of the page, above the title, full-width (it already
   renders full-width inside the content area — this just reorders it ahead of the title instead
   of after the link section).
2. The title (`isEditingTitle ? <Input>... : <h1>...`) drops `truncate` and renders on its own
   line below the cover image, allowed to wrap (`className="text-xl font-semibold"`, no
   `truncate`, no `flex-1` needed since it's no longer sharing a row).
3. Edit/delete icon buttons and the "Recipe" link chip move to their own icon row directly under
   the title (same handlers: `setIsEditingTitle`, `handleDeleteRecipe`, same `recipe.link` anchor).

No change to `handleSaveTitle`, `handleDeleteRecipe`, or any mutation logic — purely a markup
reorder within the same component.

### Testing

Bun native test runner (`bun:test`) for API, Vitest for web, per project convention. This change
is web-only.

- `AddRecipePage/index.test.tsx` — existing tests assert on labels/placeholders/roles, not on
  container structure, so most should be unaffected; add one test asserting each `FormSection`
  heading (Photo/Basics/Ingredients/Instructions/Tags/Share) is present.
- New `AddRecipePage/FormSection.test.tsx` — renders title + children.
- `RecipeDetailPage/index.tsx` currently has no dedicated test file (only child-section tests like
  `CoverImageSection.test.tsx` exist) — add a first-pass `RecipeDetailPage/index.test.tsx` covering:
  a long title renders without a `truncate` class and without being cut off (query the rendered
  text node's full content), and that edit/delete/link icons are still present and wired.
- Playwright e2e (`e2e/tests/recipe-detail.spec.ts`): add a case that creates a recipe with a very
  long title (60+ chars) and asserts the full title text is present in the DOM (not just a
  truncated prefix) — this is the regression test for the original bug.
- Re-run the existing share-target/import e2e coverage unchanged to confirm no regression (same
  flow, just re-skinned).
- **Visual regression baselines** — the repo already has Playwright screenshot tests
  (`e2e/tests/recipe-form.visual.spec.ts`, `recipe-detail.visual.spec.ts`) with committed baseline
  PNGs for mobile + desktop. This redesign *intentionally* changes those layouts, so:
  `recipe-new-form.png` (manual form screen) and `recipe-detail-populated.png` will need their
  baselines regenerated (`--update-snapshots`) as part of this change, reviewed by eye before
  committing. `recipe-new-choice.png` and `recipe-new-import.png` are unaffected (`ChoiceScreen`/
  `ImportScreen` untouched) and must NOT change — if they do, that's a real regression to fix, not
  a baseline to update.

## Files

**New**
- `packages/web/src/pages/AddRecipePage/FormSection.tsx` (+ test)

**Modified**
- `packages/web/src/pages/AddRecipePage/index.tsx` — wrap fields in `FormSection`s; sizing/spacing
  pass on inputs and row buttons
- `packages/web/src/pages/AddRecipePage/IngredientsField.tsx`,
  `packages/web/src/pages/AddRecipePage/TagsField.tsx` — each renders its own internal
  `<Label>Ingredients</Label>`/`<Label>Tags</Label>` heading today. Wrapping them in a titled
  `FormSection` would double that heading, so their internal `<Label>` is removed (the "edit
  text ↩" toggle in `IngredientsField` stays, just without the adjacent label text) — the
  `FormSection` title is now the only heading. No prop or behavior change.
- `packages/web/src/components/StepsList/ListRowButtons.tsx` — larger tap targets on
  `RemoveRowButton`/`AddRowButton` (shared by `IngredientsField` and `StepsList`)
- `packages/web/src/pages/RecipeDetailPage/index.tsx` — reorder header: image → title (wrapping,
  no truncate) → icon action row
- `e2e/tests/recipe-detail.spec.ts` — add a long-title-doesn't-clip regression case
- `e2e/tests/recipe-form.visual.spec.ts`, `recipe-detail.visual.spec.ts` — regenerated baseline
  PNGs for the screens that changed (`recipe-new-form.png`, `recipe-detail-populated.png`)

**Unmodified (confirmed, not touched)**
- `ChoiceScreen.tsx`, `ImportScreen.tsx`, `ShareTargetPage/index.tsx`, `RecipesPage`'s `sharedUrl`
  redirect, `CoverImageSection.tsx`, `IngredientsSection.tsx`, `InstructionsSection.tsx`,
  `TagsSection.tsx` — all logic as-is, only consumed by the reorganized parent JSX.

## Dependency

This stacks on the not-yet-merged `feat/recipe-tags` branch (PR #144) for the Tags section in
both pages. Branch off `feat/recipe-tags`; rebase onto `main` once #144 merges, before this PR
merges.

## Follow-ups

- Desktop-specific layout (side-by-side sections, wider form) — deferred, mobile-first per
  project convention.
- In-place ingredient editing on Add Recipe (currently remove-and-re-add only, unlike Recipe
  Detail's `IngredientItem` which supports edit) — deferred, not part of the reported complaint.
