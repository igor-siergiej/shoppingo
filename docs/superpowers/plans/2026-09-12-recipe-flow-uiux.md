# Recipe Flow UI/UX Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Add Recipe into clearly labeled, bigger-tap-target sections, and fix Recipe Detail's title-clipping bug with a hero-image header — no backend or entry-flow logic changes.

**Architecture:** A new small `FormSection` presentational component wraps each existing field group on Add Recipe (no prop/handler changes to the wrapped children). Recipe Detail's title/image/actions markup is reordered within the same component (image → wrapping title → icon row), dropping the fixed-header/scroll-body split in favor of one scrollable region (the hero image is meant to scroll away, common for this kind of content-first detail page).

**Tech Stack:** React 19, TypeScript, Tailwind, Vitest + Testing Library (web unit tests), Playwright (e2e + visual regression).

**Spec:** `docs/superpowers/specs/2026-09-12-recipe-flow-uiux-design.md`

## Global Constraints

- No backend, DB, or data-model changes — presentational only (spec Non-goals).
- No change to ingredient/step *editing capability*, only container/sizing (spec Non-goals).
- `ChoiceScreen`, `ImportScreen`, `ShareTargetPage`, and `RecipesPage`'s `sharedUrl` redirect are untouched — don't regress the existing entry-flow convergence (spec Goal 3).
- Mobile-first; desktop layout is out of scope (spec Non-goals).
- This branch (`feat/recipe-flow-uiux-rework`) stacks on `feat/recipe-tags` (PR #144) — `TagsField`/`TagsSection` already exist in this worktree.
- Run `bun run lint:fix` and `bun run tsc --noEmit` before every commit per project convention (`CLAUDE.md`).

---

### Task 1: `FormSection` component

**Files:**
- Create: `packages/web/src/pages/AddRecipePage/FormSection.tsx`
- Test: `packages/web/src/pages/AddRecipePage/FormSection.test.tsx`

**Interfaces:**
- Produces: `FormSection({ title: string, children: ReactNode })` — a `<section>` with an uppercase muted `<h2>{title}</h2>` heading followed by `children`, wrapped in a bordered/rounded card. Task 3 imports this as `import { FormSection } from './FormSection';`.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/web/src/pages/AddRecipePage/FormSection.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormSection } from './FormSection';

describe('FormSection', () => {
    it('renders the title as a heading and renders its children', () => {
        render(
            <FormSection title="Basics">
                <p>Child content</p>
            </FormSection>
        );

        expect(screen.getByRole('heading', { name: 'Basics' })).toBeInTheDocument();
        expect(screen.getByText('Child content')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && bunx vitest run src/pages/AddRecipePage/FormSection.test.tsx`
Expected: FAIL — `Cannot find module './FormSection'`

- [ ] **Step 3: Write the implementation**

```tsx
// packages/web/src/pages/AddRecipePage/FormSection.tsx
import type { ReactNode } from 'react';

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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && bunx vitest run src/pages/AddRecipePage/FormSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Lint, typecheck, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/web/src/pages/AddRecipePage/FormSection.tsx packages/web/src/pages/AddRecipePage/FormSection.test.tsx
git commit -m "feat(web): add FormSection wrapper for Add Recipe field groups"
```

---

### Task 2: Bigger tap targets on shared row buttons

**Files:**
- Modify: `packages/web/src/components/StepsList/ListRowButtons.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: same `RemoveRowButton`/`AddRowButton` props and exports as today — only `className` sizing changes. Consumed unchanged by `IngredientsField.tsx` (Task 3) and `StepsList/index.tsx` (untouched, already imports these).

- [ ] **Step 1: Read the current file to confirm the exact classes being replaced**

Run: `cat packages/web/src/components/StepsList/ListRowButtons.tsx`
Expected output (current state):

```tsx
interface RemoveRowButtonProps {
    onClick: () => void;
    disabled?: boolean;
    ariaLabel: string;
}

export const RemoveRowButton = ({ onClick, disabled, ariaLabel }: RemoveRowButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="text-destructive hover:opacity-70"
        aria-label={ariaLabel}
    >
        ×
    </button>
);

interface AddRowButtonProps {
    onClick: () => void;
    disabled?: boolean;
    label: string;
}

export const AddRowButton = ({ onClick, disabled, label }: AddRowButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-md py-1.5 hover:bg-muted/50 transition-colors"
    >
        {label}
    </button>
);
```

- [ ] **Step 2: Replace with larger tap targets**

```tsx
// packages/web/src/components/StepsList/ListRowButtons.tsx
interface RemoveRowButtonProps {
    onClick: () => void;
    disabled?: boolean;
    ariaLabel: string;
}

export const RemoveRowButton = ({ onClick, disabled, ariaLabel }: RemoveRowButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-lg text-destructive hover:opacity-70"
        aria-label={ariaLabel}
    >
        ×
    </button>
);

interface AddRowButtonProps {
    onClick: () => void;
    disabled?: boolean;
    label: string;
}

export const AddRowButton = ({ onClick, disabled, label }: AddRowButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-md py-3 hover:bg-muted/50 transition-colors"
    >
        {label}
    </button>
);
```

`h-11 w-11` is 44×44px (Tailwind's default 4px scale), the standard minimum touch-target size. `py-3` on `AddRowButton` gives it a matching taller tap area.

- [ ] **Step 3: Run the web test suite to confirm nothing broke**

Run: `bun run --filter @shoppingo/web test`
Expected: PASS (no test asserts the old class names — `StepsList` and `IngredientsField` have no dedicated test files today)

- [ ] **Step 4: Lint, typecheck, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/web/src/components/StepsList/ListRowButtons.tsx
git commit -m "feat(web): bigger tap targets on ingredient/step row buttons"
```

---

### Task 3: Restructure Add Recipe into `FormSection`s

**Files:**
- Modify: `packages/web/src/pages/AddRecipePage/index.tsx`
- Modify: `packages/web/src/pages/AddRecipePage/IngredientsField.tsx`
- Modify: `packages/web/src/pages/AddRecipePage/TagsField.tsx`

**Interfaces:**
- Consumes: `FormSection` from Task 1.
- Produces: no new exports; `AddRecipePage`'s external behavior (routes, submit flow, auto-import) is unchanged — only its own JSX and two children's internal heading markup change.

**Why `IngredientsField`/`TagsField` change:** both currently render their own `<Label>Ingredients</Label>` / `<Label>Tags</Label>` heading. Wrapping them in a titled `FormSection` would show that heading twice. Removing the internal `<Label>` (and its now-unused import) is the fix — no prop or behavior change to either component.

- [ ] **Step 1: Remove the internal heading from `IngredientsField`**

In `packages/web/src/pages/AddRecipePage/IngredientsField.tsx`, remove the `Label` import:

```tsx
// Before:
import { AddRowButton, RemoveRowButton } from '../../components/StepsList/ListRowButtons';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { splitIntoSteps } from '../../utils/splitIntoSteps';

// After:
import { AddRowButton, RemoveRowButton } from '../../components/StepsList/ListRowButtons';
import { Textarea } from '../../components/ui/textarea';
import { splitIntoSteps } from '../../utils/splitIntoSteps';
```

Replace the header row (drop the `Label`, keep the "edit text ↩" toggle right-aligned):

```tsx
// Before:
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <Label>Ingredients</Label>
            {ingredients.length > 0 && (
                <button
                    type="button"
                    onClick={() => setShowIngredientsPaste(true)}
                    className="text-xs text-muted-foreground underline"
                >
                    edit text ↩
                </button>
            )}
        </div>
        {showIngredientsPaste || ingredients.length === 0 ? (

// After:
    <div className="space-y-2">
        {ingredients.length > 0 && (
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => setShowIngredientsPaste(true)}
                    className="text-xs text-muted-foreground underline"
                >
                    edit text ↩
                </button>
            </div>
        )}
        {showIngredientsPaste || ingredients.length === 0 ? (
```

Also bump the ingredient row's vertical padding for a bigger tap target around `RemoveRowButton`:

```tsx
// Before:
                        className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm"

// After:
                        className="flex items-center gap-2 px-3 py-3 rounded-md bg-muted border border-border text-sm"
```

(`items-center` instead of `items-start` so the taller row keeps the ×-button vertically centered next to the text.)

- [ ] **Step 2: Remove the internal heading from `TagsField`**

In `packages/web/src/pages/AddRecipePage/TagsField.tsx`, remove the `Label` import:

```tsx
// Before:
import { X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

// After:
import { X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '../../components/ui/input';
```

Remove the heading line:

```tsx
// Before:
        <div className="space-y-2">
            <Label>Tags</Label>
            <Input

// After:
        <div className="space-y-2">
            <Input
```

- [ ] **Step 3: Add the `FormSection` import to `AddRecipePage/index.tsx`**

```tsx
// Before:
import { AddRecipeHeader } from './AddRecipeHeader';
import { applyImportedDraft, type ImportMeta } from './applyImportedDraft';
import { ChoiceScreen } from './ChoiceScreen';
import { ImageUploadField } from './ImageUploadField';

// After:
import { AddRecipeHeader } from './AddRecipeHeader';
import { applyImportedDraft, type ImportMeta } from './applyImportedDraft';
import { ChoiceScreen } from './ChoiceScreen';
import { FormSection } from './FormSection';
import { ImageUploadField } from './ImageUploadField';
```

- [ ] **Step 4: Replace the form-mode return JSX**

Replace everything from `return (` at the bottom of the component (the `mode === 'form'` render — after the `handleSubmit` function, before `export default AddRecipePage`) with:

```tsx
    return (
        <div className="flex flex-col h-full">
            <AddRecipeHeader onCancel={handleCancel} disabled={isLoading} />

            <div className="flex-1 overflow-y-auto px-4">
                <div className="space-y-4 py-4 max-w-lg mx-auto w-full">
                    <FormSection title="Photo">
                        <ImageUploadField
                            imageUrl={imageUrl}
                            disabled={isLoading}
                            onFileSelected={setSelectedFile}
                            onPreviewReady={setImageUrl}
                            onClear={() => {
                                setImageUrl(null);
                                setSelectedFile(null);
                            }}
                        />
                    </FormSection>

                    <FormSection title="Basics">
                        <div className="space-y-2">
                            <Label htmlFor={recipeNameId}>Recipe Title</Label>
                            <Input
                                id={recipeNameId}
                                name="recipe-title"
                                placeholder="Enter recipe title..."
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setError('');
                                }}
                                disabled={isLoading}
                                autoFocus
                                autoComplete="off"
                                className="h-12 border border-foreground/30 text-base"
                            />
                        </div>

                        <LinkImportField
                            link={link}
                            setLink={setLink}
                            isImporting={isImporting}
                            importError={importError}
                            importMeta={importMeta}
                            disabled={isLoading}
                            onImport={() => void handleImport(link)}
                            onCancelImport={handleCancelImport}
                        />
                    </FormSection>

                    <FormSection title="Ingredients">
                        <IngredientsField
                            ingredients={ingredients}
                            ingredientsPasteText={ingredientsPasteText}
                            setIngredientsPasteText={setIngredientsPasteText}
                            showIngredientsPaste={showIngredientsPaste}
                            setShowIngredientsPaste={setShowIngredientsPaste}
                            onChange={setIngredients}
                            disabled={isLoading}
                            isImporting={isImporting}
                        />
                    </FormSection>

                    <FormSection title="Instructions">
                        <div className="space-y-2">
                            {steps.length > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasteArea(true)}
                                        className="text-xs text-muted-foreground underline"
                                    >
                                        edit text ↩
                                    </button>
                                </div>
                            )}
                            {showPasteArea || steps.length === 0 ? (
                                <Textarea
                                    placeholder="Paste instructions here — each line becomes a step automatically..."
                                    value={instructionsPasteText}
                                    onChange={(e) => setInstructionsPasteText(e.target.value)}
                                    onBlur={() => {
                                        const parsed = splitIntoSteps(instructionsPasteText);
                                        if (parsed.length > 0) {
                                            setSteps(parsed);
                                            setShowPasteArea(false);
                                        }
                                    }}
                                    disabled={isLoading || isImporting}
                                    className="min-h-[100px] resize-none border border-foreground/30 text-base"
                                />
                            ) : (
                                <StepsList steps={steps} onChange={setSteps} disabled={isLoading} />
                            )}
                        </div>
                    </FormSection>

                    <FormSection title="Tags">
                        <TagsField tags={tags} onChange={setTags} disabled={isLoading} />
                    </FormSection>

                    <FormSection title="Share">
                        <FriendPicker value={selectedUsers} onChange={setSelectedUsers} seedAllByDefault />
                    </FormSection>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
            </div>

            <div className="sticky bottom-0 bg-background border-t px-4 py-3 flex flex-col gap-2 max-w-lg mx-auto w-full">
                <Button onClick={() => void handleSubmit()} disabled={isLoading || !title.trim()}>
                    {isLoading ? 'Creating...' : 'Create Recipe'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                    Cancel
                </Button>
            </div>
        </div>
    );
```

Every prop and handler passed to `ImageUploadField`, `LinkImportField`, `IngredientsField`, `StepsList`, `TagsField`, `FriendPicker`, `Button` is identical to what was there before — only the surrounding structure changed.

- [ ] **Step 5: Run the existing Add Recipe test suite**

Run: `bun run --filter @shoppingo/web test -- --run src/pages/AddRecipePage`
Expected: PASS. These tests query by label/placeholder/role, not container structure, so they should be unaffected. If any fail, read the failure — it means a prop got dropped in Step 4, not that the test itself is wrong.

- [ ] **Step 6: Add a test asserting every section heading is present**

In `packages/web/src/pages/AddRecipePage/index.test.tsx`, add (near the other rendering tests, after `renderPage` is defined):

```tsx
    it('groups fields into labeled sections', async () => {
        renderPage();
        await enterManualMode();

        for (const heading of ['Photo', 'Basics', 'Ingredients', 'Instructions', 'Tags', 'Share']) {
            expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
        }
    });
```

(This follows the existing file's `enterManualMode()` helper already used by other tests in this file — reuse it, don't redefine it.)

- [ ] **Step 7: Run the full web test suite**

Run: `bun run --filter @shoppingo/web test`
Expected: PASS

- [ ] **Step 8: Lint, typecheck, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/web/src/pages/AddRecipePage/index.tsx packages/web/src/pages/AddRecipePage/index.test.tsx packages/web/src/pages/AddRecipePage/IngredientsField.tsx packages/web/src/pages/AddRecipePage/TagsField.tsx
git commit -m "feat(web): restructure Add Recipe into labeled FormSections"
```

---

### Task 4: Recipe Detail hero-image header

**Files:**
- Modify: `packages/web/src/pages/RecipeDetailPage/index.tsx`

**Interfaces:**
- Consumes: nothing new — `CoverImageSection`, `IngredientSelectSection`, `TagsSection`, `IngredientsSection`, `InstructionsSection` keep their existing props.
- Produces: no new exports; same handlers (`handleSaveTitle`, `handleDeleteRecipe`, `handleSaveLink`, etc.) — only the JSX layout changes.

**Design decision (not fully specified in the spec's static mockup):** the hero image and title now live in the single scrollable region instead of a separate fixed header — they scroll away with the rest of the content, which is the common pattern for this kind of content page and keeps the implementation simple (no more two-region flex split).

- [ ] **Step 1: Replace the header + content JSX**

Replace the whole block from `{!isLoading && !isError && recipe && (` through its matching closing `)}` (currently spanning the `isEditingTitle` header, the `flex-1 overflow-y-auto` content wrapper, and the `isSelectMode` conditional) with:

```tsx
            {!isLoading && !isError && recipe && (
                <div className="flex-1 overflow-y-auto">
                    <CoverImageSection recipe={recipe} isOwner={isOwner} onImageChange={() => void refetch()} />

                    <div className="p-4 space-y-6">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button size="sm" onClick={handleSaveTitle}>
                                    Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setIsEditingTitle(false)}>
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <h1 className="text-xl font-semibold leading-snug">{recipe.title}</h1>
                                <div className="flex items-center gap-2">
                                    {recipe.link && (
                                        <a
                                            href={recipe.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                                            aria-label="Open original recipe"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Recipe
                                        </a>
                                    )}
                                    {isOwner && (
                                        <>
                                            <button
                                                onClick={() => setIsEditingTitle(true)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
                                                aria-label="Edit recipe title"
                                                type="button"
                                            >
                                                <Pencil className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={handleDeleteRecipe}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-destructive hover:bg-opacity-10 transition-colors text-destructive"
                                                aria-label="Delete recipe"
                                                type="button"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {isSelectMode ? (
                            <IngredientSelectSection
                                recipe={recipe}
                                lists={lists}
                                onCancel={() => setIsSelectMode(false)}
                                onConfirm={handleConfirmAddToList}
                            />
                        ) : (
                            <>
                                {isOwner && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                            Recipe Link
                                        </p>
                                        {isEditingLink ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    type="url"
                                                    value={editedLink}
                                                    onChange={(e) => setEditedLink(e.target.value)}
                                                    placeholder="https://..."
                                                    className="flex-1"
                                                    autoFocus
                                                />
                                                <Button size="sm" onClick={handleSaveLink}>
                                                    Save
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setIsEditingLink(false)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditingLink(true)}
                                            >
                                                {recipe.link ? 'Edit Link' : 'Add Link'}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                <TagsSection tags={recipe.tags} isOwner={isOwner} onDeleteTag={handleDeleteTag} />

                                <IngredientsSection
                                    recipe={recipe}
                                    isOwner={isOwner}
                                    onUpdateIngredients={handleUpdateIngredients}
                                />

                                <InstructionsSection
                                    instructions={recipe.instructions ?? undefined}
                                    isOwner={isOwner}
                                    onSave={handleSaveInstructions}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}
```

This drops the old outer `<div className="flex flex-col flex-1 overflow-hidden">` wrapper entirely — it's no longer needed since there's only one scrollable region now, not a fixed-header + scroll-body pair. The `truncate` class and the `flex-1` on the old inline `<h1>` are both gone (that was the clipping bug); the title is now on its own line above a `space-y-2` block, free to wrap.

- [ ] **Step 2: Run the existing e2e recipe-detail suite locally**

The unit-test file doesn't exist yet (Task 5 adds it) but this is a good point to sanity-check nothing is obviously broken. Skip running Playwright here (needs the dev stack up) — Task 6 covers that. Instead just typecheck:

Run: `bun run tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Lint, typecheck, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/web/src/pages/RecipeDetailPage/index.tsx
git commit -m "feat(web): hero-image Recipe Detail header, fix title clipping"
```

---

### Task 5: Recipe Detail unit test coverage

**Files:**
- Create: `packages/web/src/pages/RecipeDetailPage/index.test.tsx`

**Interfaces:**
- Consumes: `RecipeDetailPage` default export from Task 4's file (unchanged export shape).

`RecipeDetailPage/index.tsx` has no dedicated test file today (only child sections like `CoverImageSection.test.tsx` do) — this task adds the first one, scoped to what this change actually touches: the title no longer clipping, and edit/delete still being present and wired.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/web/src/pages/RecipeDetailPage/index.test.tsx
import type { Recipe } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import RecipeDetailPage from './index';

vi.mock('@imapps/web-utils', () => ({
    useUser: () => ({ user: { id: 'user-1', username: 'testuser' } }),
}));

vi.mock('../../hooks/useRecipeMutations', () => ({
    useRecipeMutations: () => ({ updateRecipe: vi.fn(), deleteRecipe: vi.fn() }),
}));

vi.mock('../../hooks/useManageRecipeUsers', () => ({
    useManageRecipeUsers: () => ({ addUserMutation: {}, removeUserMutation: {} }),
}));

vi.mock('../../components/ToolBar', () => ({ default: () => <div data-testid="toolbar" /> }));
vi.mock('../../components/ManageUsersDrawer', () => ({ ManageUsersDrawer: () => null }));
vi.mock('./CoverImageSection', () => ({ CoverImageSection: () => <div data-testid="cover-image" /> }));
vi.mock('./IngredientSelectSection', () => ({ IngredientSelectSection: () => null }));
vi.mock('./IngredientsSection', () => ({ IngredientsSection: () => null }));
vi.mock('./InstructionsSection', () => ({ InstructionsSection: () => null }));
vi.mock('./TagsSection', () => ({ TagsSection: () => null }));

let mockRecipe: Recipe;

vi.mock('../../api', () => ({
    getRecipeQuery: (id: string) => ({ queryKey: ['recipe', id], queryFn: async () => mockRecipe }),
    getListsQuery: () => ({ queryKey: ['lists'], queryFn: async () => [] }),
    addItemsBulk: vi.fn(),
}));

const renderPage = (recipeId = 'recipe-1') => {
    const queryClient = new QueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/recipes/${recipeId}`]}>
                <Routes>
                    <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe('RecipeDetailPage', () => {
    it('renders a long title in full, without truncating', async () => {
        const longTitle = "Grandma's Slow-Cooked Beef Bourguignon With Red Wine And Root Vegetables";
        mockRecipe = {
            id: 'recipe-1',
            title: longTitle,
            ingredients: [],
            ownerId: 'user-1',
            users: [{ id: 'user-1', username: 'testuser' }],
            dateAdded: new Date(),
        };

        renderPage();

        const heading = await screen.findByRole('heading', { name: longTitle });
        expect(heading.className).not.toContain('truncate');
    });

    it('shows edit and delete actions for the owner', async () => {
        mockRecipe = {
            id: 'recipe-1',
            title: 'Pasta',
            ingredients: [],
            ownerId: 'user-1',
            users: [{ id: 'user-1', username: 'testuser' }],
            dateAdded: new Date(),
        };

        renderPage();

        await screen.findByRole('heading', { name: 'Pasta' });
        expect(screen.getByLabelText('Edit recipe title')).toBeInTheDocument();
        expect(screen.getByLabelText('Delete recipe')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it passes**

(This is a regression/characterization test against already-implemented Task 4 code, so it should pass immediately rather than fail-then-pass — run it to confirm.)

Run: `bun run --filter @shoppingo/web test -- --run src/pages/RecipeDetailPage/index.test.tsx`
Expected: PASS, 2 tests

If it fails on a missing mock (e.g. an unmocked child component throwing), read the error, add the missing `vi.mock` for that child following the same pattern, and rerun.

- [ ] **Step 3: Run the full web test suite**

Run: `bun run --filter @shoppingo/web test`
Expected: PASS

- [ ] **Step 4: Lint, typecheck, commit**

```bash
bun run lint:fix
bun run tsc --noEmit
git add packages/web/src/pages/RecipeDetailPage/index.test.tsx
git commit -m "test(web): cover Recipe Detail's long-title-doesn't-clip fix"
```

---

### Task 6: e2e regression test + visual snapshot baselines

**Files:**
- Modify: `e2e/tests/recipe-detail.spec.ts`
- Modify (regenerated screenshots): `e2e/tests/recipe-form.visual.spec.ts-snapshots/recipe-new-form-*.png`, `e2e/tests/recipe-detail.visual.spec.ts-snapshots/recipe-detail-populated-*.png`

**Interfaces:**
- Consumes: `apiCreateRecipe` from `../api-helpers` (already imported in this file).

- [ ] **Step 1: Add the long-title e2e regression case**

In `e2e/tests/recipe-detail.spec.ts`, add (inside the existing `test.describe('Recipe detail page', ...)` block, after the `'renders recipe title and ingredients heading'` test):

```ts
    test('a long title renders in full without clipping', async ({ authenticatedPage }) => {
        const longTitle =
            "Grandma's Slow-Cooked Beef Bourguignon With Red Wine, Root Vegetables And Fresh Herbs";
        const recipe = await apiCreateRecipe(longTitle);
        await authenticatedPage.goto(`/recipes/${recipe.id}`);
        await authenticatedPage.locator('h1').last().waitFor({ timeout: 10000 });

        const heading = authenticatedPage.locator('h1').filter({ hasText: longTitle });
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText(longTitle);
        const classAttr = (await heading.getAttribute('class')) ?? '';
        expect(classAttr).not.toContain('truncate');
    });
```

- [ ] **Step 2: Run this test locally against the dev stack**

Bring up the dev stack per `CLAUDE.md` (`bun run start`, MongoDB/MinIO already running per project convention), then:

Run: `bun run test:e2e -- --grep "a long title renders in full"`
Expected: PASS

If MongoDB/MinIO aren't running, see the project's dev-stack setup notes before this step — this task assumes they already are (needed for every other e2e test in this suite too).

- [ ] **Step 3: Regenerate the two affected visual baselines**

```bash
bun run test:e2e -- --grep "manual form screen" --update-snapshots
bun run test:e2e -- --grep "populated state" --update-snapshots
```

- [ ] **Step 4: Confirm the unaffected visual baselines did NOT change**

```bash
git status --short e2e/tests/recipe-form.visual.spec.ts-snapshots/ e2e/tests/recipe-detail.visual.spec.ts-snapshots/
```

Expected: only `recipe-new-form-desktop-visual-linux.png`, `recipe-new-form-mobile-visual-linux.png`,
`recipe-detail-populated-desktop-visual-linux.png`, `recipe-detail-populated-mobile-visual-linux.png`
show as modified. If `recipe-new-choice-*.png` or `recipe-new-import-*.png` show as modified, that
is a real regression (`ChoiceScreen`/`ImportScreen` were supposed to be untouched) — stop and
investigate before continuing; do not commit those.

- [ ] **Step 5: Eyeball the regenerated screenshots**

Open the four changed PNGs (from Step 4) and visually confirm they show the new sectioned Add
Recipe form and hero-image Recipe Detail header, with nothing obviously broken (overlapping text,
missing content, layout overflow).

- [ ] **Step 6: Run the full e2e suite**

Run: `bun run test:e2e`
Expected: PASS (this also re-confirms the unaffected visual specs still match their existing baselines)

- [ ] **Step 7: Commit**

```bash
git add e2e/tests/recipe-detail.spec.ts \
        e2e/tests/recipe-form.visual.spec.ts-snapshots/recipe-new-form-desktop-visual-linux.png \
        e2e/tests/recipe-form.visual.spec.ts-snapshots/recipe-new-form-mobile-visual-linux.png \
        e2e/tests/recipe-detail.visual.spec.ts-snapshots/recipe-detail-populated-desktop-visual-linux.png \
        e2e/tests/recipe-detail.visual.spec.ts-snapshots/recipe-detail-populated-mobile-visual-linux.png
git commit -m "test(e2e): cover long-title clipping fix, update visual baselines"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint the whole repo**

Run: `bun run lint`
Expected: no errors

- [ ] **Step 2: Typecheck the whole repo**

Run: `bun run tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run the full web and API test suites**

Run: `bun run --filter @shoppingo/api test && bun run --filter @shoppingo/web test`
Expected: both PASS

- [ ] **Step 4: Build both packages**

Run: `bun run --filter @shoppingo/api build && bun run --filter @shoppingo/web build`
Expected: both succeed

- [ ] **Step 5: Manual check on a real device**

Start the dev stack (`bun run start`) and expose it on Tailscale (see the `exposing-dev-server-on-tailnet` skill) so it can be reviewed on a phone: walk through creating a recipe (all six sections visible, bigger tap targets on ingredient rows) and viewing a recipe with a long title (confirm it wraps instead of clipping).

- [ ] **Step 6: Open the PR**

```bash
git push -u origin feat/recipe-flow-uiux-rework
gh pr create --title "feat(web): recipe UI/UX rework — sectioned Add Recipe, hero-image Recipe Detail" \
  --body "See docs/superpowers/specs/2026-09-12-recipe-flow-uiux-design.md. Stacks on #144 (feat/recipe-tags) — merge that first and rebase this before merging."
```

Note the local `fallow-audit` pre-push hook may flag pre-existing complexity/duplication in files this branch touches (`AddRecipePage/index.tsx`, `RecipeDetailPage/index.tsx` already carry `// fallow-ignore-next-line complexity` from before this branch) — if it blocks the push on a *new* finding introduced by this branch's own changes, fix that finding; if it's pre-existing debt in a function this plan didn't touch, follow the repo's existing convention of a `// fallow-ignore-next-line complexity` comment (see `AddRecipePage/index.tsx` for the precedent) rather than expanding scope into an unplanned refactor.
