# Toolbar Actions Speed-Dial FAB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom `ToolBar`'s cramped, page-dependent right icon group with a static 2-icon nav (Calendar/Back, Menu) plus a separate always-visible speed-dial FAB (bottom-left) that reveals per-page actions (Clear Selected, Remove All, Add from Recipe, Add to Shopping List, Manage Users, Manage Labels).

**Architecture:** `ToolBar/index.tsx` builds a page-specific `ActionItem[]` array (same shape already used by `HamburgerMenu`'s `SimpleButtonItem`) and hands it to a new self-contained `ActionsFab` component, mounted as a sibling of the existing nav `Card`, not inside it. `ToolBarAppBar` and `HamburgerMenu` both shrink — they lose every page-scoped prop/button that moves to the FAB. `AddFromRecipeDrawer` gains a `hideTrigger` prop so its drawer can be opened from the FAB instead of its own inline trigger button.

**Tech Stack:** React 19, TypeScript, `motion/react` (Framer Motion) for the FAB's expand animation, Tailwind CSS, Vitest + `@testing-library/react` for tests.

## Global Constraints

- All web tests use Vitest (`bun run --filter @shoppingo/web test -- run <path>`), imported from `vitest` / `@testing-library/react` — not `bun:test`.
- Run `bun run lint:fix` and `bun run tsc --noEmit` before each commit (repo convention, Biome + strict TS).
- Commit messages follow Conventional Commits (enforced by commitlint + Husky).
- No visual redesign of drawer contents (`AddItemDrawer`, `AddRecipeDrawer`, etc.) — only where triggers live.
- Reference design: `docs/superpowers/specs/2026-08-01-toolbar-nav-actions-split-design.md`.

---

### Task 1: `AddFromRecipeDrawer` — optional `hideTrigger` prop

**Files:**
- Modify: `packages/web/src/components/ToolBar/AddFromRecipeDrawer/index.tsx`
- Test: `packages/web/src/components/ToolBar/AddFromRecipeDrawer/index.test.tsx` (new)

**Interfaces:**
- Produces: `AddFromRecipeDrawerProps.hideTrigger?: boolean` (default `false`). When `true`, the component renders no visible trigger button of its own — visibility is controlled entirely via the existing `open`/`onOpenChange` props (already a fully controlled component).

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/components/ToolBar/AddFromRecipeDrawer/index.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddFromRecipeDrawer } from './index';

vi.mock('react-query', () => ({
    useQuery: () => ({ data: [] }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@imapps/web-utils', () => ({
    useUser: () => ({ user: { id: 'user-1' } }),
}));

describe('AddFromRecipeDrawer', () => {
    const noop = () => {};

    it('renders its own trigger button by default', () => {
        render(<AddFromRecipeDrawer open={false} onOpenChange={noop} listTitle="Groceries" listItems={[]} />);
        expect(screen.getByLabelText('Add from recipe')).toBeInTheDocument();
    });

    it('hides its trigger button when hideTrigger is true', () => {
        render(
            <AddFromRecipeDrawer open={false} onOpenChange={noop} listTitle="Groceries" listItems={[]} hideTrigger />
        );
        expect(screen.queryByLabelText('Add from recipe')).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/AddFromRecipeDrawer/index.test.tsx`
Expected: second test FAILs (`hideTrigger` prop doesn't exist yet, trigger always renders).

- [ ] **Step 3: Add the `hideTrigger` prop**

In `packages/web/src/components/ToolBar/AddFromRecipeDrawer/index.tsx`, change:

```tsx
interface AddFromRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listTitle: string;
    listItems: Item[];
}

export const AddFromRecipeDrawer = ({ open, onOpenChange, listTitle, listItems }: AddFromRecipeDrawerProps) => {
```

to:

```tsx
interface AddFromRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listTitle: string;
    listItems: Item[];
    hideTrigger?: boolean;
}

export const AddFromRecipeDrawer = ({
    open,
    onOpenChange,
    listTitle,
    listItems,
    hideTrigger = false,
}: AddFromRecipeDrawerProps) => {
```

Then wrap the existing `<RippleButton>` trigger (the one with `aria-label="Add from recipe"`) in a conditional:

```tsx
        <Drawer open={open} onOpenChange={onOpenChange}>
            {!hideTrigger && (
                <RippleButton
                    size="icon"
                    variant="ghost"
                    aria-label="Add from recipe"
                    className="h-12 w-12 rounded-full"
                    onClick={() => onOpenChange(true)}
                >
                    <div className="relative w-5 h-5 flex items-center justify-center">
                        <BookOpen className="size-5" />
                        <Plus className="size-3 absolute bottom-0 right-0 bg-white rounded-full text-primary" />
                    </div>
                </RippleButton>
            )}

            <DrawerContent>
```

(The closing `</DrawerContent>` and everything below is unchanged — only the trigger button gets wrapped.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/AddFromRecipeDrawer/index.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ToolBar/AddFromRecipeDrawer/index.tsx packages/web/src/components/ToolBar/AddFromRecipeDrawer/index.test.tsx
git commit -m "feat(web): add hideTrigger prop to AddFromRecipeDrawer"
```

---

### Task 2: `ActionsFab` component

**Files:**
- Create: `packages/web/src/components/ToolBar/ActionsFab/index.tsx`
- Test: `packages/web/src/components/ToolBar/ActionsFab/index.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface ActionItem {
      show: boolean;
      label: string;
      icon: ComponentType<{ className?: string }>;
      onClick: () => void;
      disabled?: boolean;
      variant?: 'default' | 'destructive';
  }

  interface ActionsFabProps {
      actionItems: ActionItem[];
  }

  export const ActionsFab = ({ actionItems }: ActionsFabProps) => JSX.Element | null;
  ```
  `ActionsFab` renders `null` when no `actionItems` have `show: true`. Otherwise renders a `+` FAB (`fixed bottom-28 left-4 z-40`) that expands, on tap, into a vertical stack of labeled circular buttons for each visible item, closest to the FAB rendering first. Clicking a non-disabled item calls its `onClick` and collapses the FAB.

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/components/ToolBar/ActionsFab/index.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckCheck, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { ActionsFab } from './index';

describe('ActionsFab', () => {
    it('renders nothing when no action items are visible', () => {
        const { container } = render(
            <ActionsFab actionItems={[{ show: false, label: 'Clear Selected', icon: CheckCheck, onClick: vi.fn() }]} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a closed FAB when at least one action item is visible', () => {
        render(
            <ActionsFab actionItems={[{ show: true, label: 'Clear Selected', icon: CheckCheck, onClick: vi.fn() }]} />
        );
        expect(screen.getByTitle('Actions')).toBeInTheDocument();
        expect(screen.queryByText('Clear Selected')).not.toBeInTheDocument();
    });

    it('expands to show visible action items on tap', async () => {
        const user = userEvent.setup();
        render(
            <ActionsFab actionItems={[{ show: true, label: 'Clear Selected', icon: CheckCheck, onClick: vi.fn() }]} />
        );
        await user.click(screen.getByTitle('Actions'));
        expect(screen.getByText('Clear Selected')).toBeInTheDocument();
    });

    it('does not render hidden items even when expanded', async () => {
        const user = userEvent.setup();
        render(
            <ActionsFab
                actionItems={[
                    { show: true, label: 'Clear Selected', icon: CheckCheck, onClick: vi.fn() },
                    { show: false, label: 'Remove All', icon: Trash2, onClick: vi.fn() },
                ]}
            />
        );
        await user.click(screen.getByTitle('Actions'));
        expect(screen.getByText('Clear Selected')).toBeInTheDocument();
        expect(screen.queryByText('Remove All')).not.toBeInTheDocument();
    });

    it('calls onClick and collapses when an action item is clicked', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<ActionsFab actionItems={[{ show: true, label: 'Clear Selected', icon: CheckCheck, onClick }]} />);
        await user.click(screen.getByTitle('Actions'));
        await user.click(screen.getByTitle('Clear Selected'));
        expect(onClick).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(screen.queryByText('Clear Selected')).not.toBeInTheDocument());
    });

    it('collapses when the FAB is tapped a second time', async () => {
        const user = userEvent.setup();
        render(
            <ActionsFab actionItems={[{ show: true, label: 'Clear Selected', icon: CheckCheck, onClick: vi.fn() }]} />
        );
        await user.click(screen.getByTitle('Actions'));
        expect(screen.getByText('Clear Selected')).toBeInTheDocument();
        await user.click(screen.getByTitle('Actions'));
        await waitFor(() => expect(screen.queryByText('Clear Selected')).not.toBeInTheDocument());
    });

    it('does not call onClick for a disabled item', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(
            <ActionsFab
                actionItems={[{ show: true, label: 'Remove All', icon: Trash2, onClick, disabled: true }]}
            />
        );
        await user.click(screen.getByTitle('Actions'));
        await user.click(screen.getByTitle('Remove All'));
        expect(onClick).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/ActionsFab/index.test.tsx`
Expected: FAIL — module `./index` does not exist yet.

- [ ] **Step 3: Implement `ActionsFab`**

Create `packages/web/src/components/ToolBar/ActionsFab/index.tsx`:

```tsx
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentType } from 'react';
import { useState } from 'react';

export interface ActionItem {
    show: boolean;
    label: string;
    icon: ComponentType<{ className?: string }>;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive';
}

interface ActionsFabProps {
    actionItems: ActionItem[];
}

const circleClasses = (variant: ActionItem['variant'], disabled: boolean | undefined) => {
    if (disabled) return 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed';
    if (variant === 'destructive') return 'bg-destructive text-white';
    return 'bg-secondary text-secondary-foreground';
};

export const ActionsFab = ({ actionItems }: ActionsFabProps) => {
    const [open, setOpen] = useState(false);
    const visibleItems = actionItems.filter((item) => item.show);

    if (visibleItems.length === 0) return null;

    const handleItemClick = (item: ActionItem) => {
        if (item.disabled) return;
        item.onClick();
        setOpen(false);
    };

    return (
        <div className="fixed bottom-28 left-4 z-40 flex flex-col items-start gap-3">
            <AnimatePresence>
                {open && (
                    <div className="flex flex-col gap-3 mb-1">
                        {visibleItems.map((item, i) => {
                            const Icon = item.icon;
                            const delayIndex = visibleItems.length - 1 - i;
                            return (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 12, scale: 0.6 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 12, scale: 0.6 }}
                                    transition={{
                                        delay: delayIndex * 0.04,
                                        type: 'spring',
                                        bounce: 0.3,
                                        duration: 0.3,
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <span className="bg-foreground text-background text-xs font-medium px-2.5 py-1 rounded-md shadow-md whitespace-nowrap">
                                        {item.label}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleItemClick(item)}
                                        disabled={item.disabled}
                                        title={item.label}
                                        className={`size-11 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform ${circleClasses(item.variant, item.disabled)}`}
                                    >
                                        <Icon className="size-5" />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </AnimatePresence>

            <motion.button
                type="button"
                onClick={() => setOpen((o) => !o)}
                animate={{ rotate: open ? 45 : 0 }}
                title="Actions"
                className="size-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center text-2xl font-light"
            >
                +
            </motion.button>
        </div>
    );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/ActionsFab/index.test.tsx`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ToolBar/ActionsFab/index.tsx packages/web/src/components/ToolBar/ActionsFab/index.test.tsx
git commit -m "feat(web): add ActionsFab speed-dial component"
```

---

### Task 3: Simplify `ToolBarAppBar` — drop page-action props

**Files:**
- Modify: `packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx`
- Modify: `packages/web/src/components/ToolBar/ToolBarAppBar/index.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ToolBarAppBarProps` drops `onClearSelected`, `onRemoveAll`, `onToggleSelectMode`, `disableClearSelected`, `disableClearAll`, `recipePickerDrawer`. Right icon group becomes exactly `[Calendar|Back]`, `Menu` — no other consumer of `ToolBarAppBar` may pass the removed props (TypeScript will catch any that still try to).

- [ ] **Step 1: Update the failing/obsolete tests first**

In `packages/web/src/components/ToolBar/ToolBarAppBar/index.test.tsx`, delete these five `it(...)` blocks (they test props being removed in this task): `'shows clear selected button when handler provided'`, `'hides clear selected button when handler not provided'`, `'shows remove all button when handler provided'`, `'disables clear selected button when flag is true'`, `'disables remove all button when flag is true'`.

The remaining file (after deletion) should still contain: `'should export ToolBarAppBar'`, `'shows back button on items page'`, `'shows navigation buttons on non-items non-lists page'`, `'hides back button on lists page'`, `'always renders menu button'`, `'renders a Calendar button that navigates to /calendar'`, `'renders a Friends button that navigates to /friends'`.

- [ ] **Step 2: Run tests to verify remaining ones still pass against old component**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/ToolBarAppBar/index.test.tsx`
Expected: PASS (7/7) — component hasn't changed yet, only obsolete tests were removed.

- [ ] **Step 3: Simplify the component**

In `packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx`, change the imports from:

```tsx
import { ArrowLeft, BookOpen, Calendar, CheckCheck, Menu, ShoppingCart, Trash2, Users } from 'lucide-react';
```

to:

```tsx
import { ArrowLeft, BookOpen, Calendar, Menu, ShoppingCart, Users } from 'lucide-react';
```

Change the props interface from:

```tsx
interface ToolBarAppBarProps {
    isItemsPage: boolean;
    isListsPage: boolean;
    isRecipesPage?: boolean;
    isRecipeDetailPage?: boolean;
    isCalendarPage?: boolean;
    isFriendsPage?: boolean;
    onGoBack?: () => void;
    onClearSelected?: () => void;
    onRemoveAll?: () => void;
    onToggleSelectMode?: () => void;
    onMenuClick: () => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
    itemDrawer?: ReactNode;
    listDrawer?: ReactNode;
    recipeDrawer?: ReactNode;
    ingredientDrawer?: ReactNode;
    recipePickerDrawer?: ReactNode;
    todoDrawer?: ReactNode;
    friendDrawer?: ReactNode;
}
```

to:

```tsx
interface ToolBarAppBarProps {
    isItemsPage: boolean;
    isListsPage: boolean;
    isRecipesPage?: boolean;
    isRecipeDetailPage?: boolean;
    isCalendarPage?: boolean;
    isFriendsPage?: boolean;
    onGoBack?: () => void;
    onMenuClick: () => void;
    itemDrawer?: ReactNode;
    listDrawer?: ReactNode;
    recipeDrawer?: ReactNode;
    ingredientDrawer?: ReactNode;
    todoDrawer?: ReactNode;
    friendDrawer?: ReactNode;
}
```

Update the destructured props in the component signature to match (drop `onClearSelected`, `onRemoveAll`, `onToggleSelectMode`, `disableClearSelected = false`, `disableClearAll = false`, `recipePickerDrawer`).

Change the center row from:

```tsx
                <div className="flex items-center gap-1 justify-self-center">
                    {isItemsPage && itemDrawer}
                    {isListsPage && listDrawer}
                    {isRecipesPage && recipeDrawer}
                    {isRecipeDetailPage && ingredientDrawer}
                    {isCalendarPage && todoDrawer}
                    {isFriendsPage && friendDrawer}
                    {isItemsPage && recipePickerDrawer}
                </div>
```

to:

```tsx
                <div className="flex items-center gap-1 justify-self-center">
                    {isItemsPage && itemDrawer}
                    {isListsPage && listDrawer}
                    {isRecipesPage && recipeDrawer}
                    {isRecipeDetailPage && ingredientDrawer}
                    {isCalendarPage && todoDrawer}
                    {isFriendsPage && friendDrawer}
                </div>
```

Change the right group from:

```tsx
                <div className="flex items-center gap-1 justify-self-end">
                    <ToolBarButton
                        icon={Calendar}
                        title="Calendar"
                        onClick={() => navigate('/calendar')}
                        active={isCalendarPage}
                    />
                    {onClearSelected && (
                        <ToolBarButton
                            icon={CheckCheck}
                            title="Clear selected items"
                            onClick={onClearSelected}
                            disabled={disableClearSelected}
                        />
                    )}
                    {onRemoveAll && (
                        <ToolBarButton
                            icon={Trash2}
                            title="Remove all items"
                            onClick={onRemoveAll}
                            disabled={disableClearAll}
                            variant="destructive"
                        />
                    )}
                    {isRecipeDetailPage && onToggleSelectMode && (
                        <ToolBarButton icon={ShoppingCart} title="Add to shopping list" onClick={onToggleSelectMode} />
                    )}
                    <ToolBarButton icon={Menu} title="Menu" onClick={onMenuClick} />
                </div>
```

to:

```tsx
                <div className="flex items-center gap-1 justify-self-end">
                    <ToolBarButton
                        icon={Calendar}
                        title="Calendar"
                        onClick={() => navigate('/calendar')}
                        active={isCalendarPage}
                    />
                    <ToolBarButton icon={Menu} title="Menu" onClick={onMenuClick} />
                </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/ToolBarAppBar/index.test.tsx`
Expected: PASS (7/7).

- [ ] **Step 5: Type-check**

Run: `bun run tsc --noEmit` (from repo root)
Expected: fails here — `ToolBar/index.tsx` still passes the now-removed props to `ToolBarAppBar`. That's expected; Task 5 fixes the call site. Confirm the *only* errors are in `ToolBar/index.tsx` referencing the props removed in this task, then proceed.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx packages/web/src/components/ToolBar/ToolBarAppBar/index.test.tsx
git commit -m "refactor(web): drop page-action props from ToolBarAppBar"
```

---

### Task 4: Simplify `HamburgerMenu` — app settings only

**Files:**
- Modify: `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx`
- Modify: `packages/web/src/components/ToolBar/HamburgerMenu/index.test.tsx`

**Interfaces:**
- Produces: `HamburgerMenuProps` shrinks to `{ onClose: () => void; onLogout: () => void }` — drops `currentList`, `userId`, `onManageUsers`, `onManageLabels`. Menu content becomes: Install app (conditional), Theme toggle, Notification toggle, Test reminder button, Update button, Log out.

- [ ] **Step 1: Update the failing/obsolete tests first**

In `packages/web/src/components/ToolBar/HamburgerMenu/index.test.tsx`:

- Remove the `mockOnManageUsers` const and its `.mockClear()` call in `beforeEach`.
- Remove these `it(...)` blocks entirely: `'shows manage users button when user is list owner'`, `'hides manage users button when user is not list owner'`, `'hides manage users button when there is no current list'`, `'calls onManageUsers when manage users button is clicked'`.
- In every remaining `render(<HamburgerMenu .../>)` call, drop the `currentList`, `userId`, and `onManageUsers` props/lines. For example:

```tsx
    it('renders logout button', () => {
        render(<HamburgerMenu onClose={mockOnClose} onLogout={mockOnLogout} />);

        expect(screen.getByText('Log out')).toBeInTheDocument();
    });
```

Apply the same trim to `'renders dark mode toggle'`, `'calls onLogout when logout button is clicked'`, `'has proper button variants'`. The `'renders the notifications toggle when push is supported'` test already only passes `onClose`/`onLogout`-equivalent — update it to `render(<HamburgerMenu onClose={() => {}} onLogout={() => {}} />)`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/HamburgerMenu/index.test.tsx`
Expected: FAIL — TypeScript/prop-shape mismatch or runtime errors, since the component still requires the old props (or just accepts extras harmlessly but the removed-manage-users tests are gone so this really just verifies nothing broke prematurely; the meaningful fail happens once Task 2's `HamburgerMenuProps` type is strict — vitest run wouldn't itself fail on excess/missing untyped JS props at runtime here, so instead confirm via `bun run tsc --noEmit` after Step 3 as the real gate). Proceed to Step 3.

- [ ] **Step 3: Simplify the component**

In `packages/web/src/components/ToolBar/HamburgerMenu/index.tsx`, change the icon import from:

```tsx
import { Bell, BellRing, Download, Loader2, LogOut, Moon, RefreshCw, Sun, Tag, Users } from 'lucide-react';
```

to:

```tsx
import { Bell, BellRing, Download, Loader2, LogOut, Moon, RefreshCw, Sun } from 'lucide-react';
```

Change the props interface from:

```tsx
export interface HamburgerMenuProps {
    currentList?: { title: string; ownerId?: string };
    userId?: string;
    onManageUsers: () => void;
    onManageLabels?: () => void;
    onClose: () => void;
    onLogout: () => void;
}
```

to:

```tsx
export interface HamburgerMenuProps {
    onClose: () => void;
    onLogout: () => void;
}
```

Change the component body from:

```tsx
export const HamburgerMenu = ({
    currentList,
    userId,
    onManageUsers,
    onManageLabels,
    onClose,
    onLogout,
}: HamburgerMenuProps) => {
    const { canInstall, isInstalled, hasUpdate, installApp, updateApp, checkForUpdate, isCheckingForUpdate } = usePWA();
    const isOwner = !!(currentList && currentList.ownerId === userId);

    const handleInstall = async () => {
        const success = await installApp();
        if (success) onClose();
    };

    const handleUpdate = async () => {
        onClose();
        await updateApp();
    };

    const conditionalButtons: SimpleButtonItem[] = [
        {
            show: isOwner,
            label: 'Manage Users',
            icon: <Users className="h-4 w-4 mr-2" />,
            onClick: onManageUsers,
        },
        {
            show: !!onManageLabels,
            label: 'Manage Labels',
            icon: <Tag className="h-4 w-4 mr-2" />,
            onClick: () => onManageLabels?.(),
        },
        {
            show: canInstall && !isInstalled,
            label: 'Install app',
            icon: <Download className="h-4 w-4 mr-2" />,
            onClick: handleInstall,
            delay: 0.1,
        },
    ];

    return (
        <div className="flex flex-col gap-2.5">
            {conditionalButtons
                .filter((item) => item.show)
                .map((item) => (
                    <MenuItem key={item.label} delay={item.delay}>
                        <Button variant="outline" onClick={item.onClick} className={OUTLINE_BTN}>
                            {item.icon}
                            {item.label}
                        </Button>
                    </MenuItem>
                ))}

            <MenuItem delay={isOwner ? 0.1 : 0.05}>
                <ThemeToggle />
            </MenuItem>
```

to:

```tsx
export const HamburgerMenu = ({ onClose, onLogout }: HamburgerMenuProps) => {
    const { canInstall, isInstalled, hasUpdate, installApp, updateApp, checkForUpdate, isCheckingForUpdate } = usePWA();

    const handleInstall = async () => {
        const success = await installApp();
        if (success) onClose();
    };

    const handleUpdate = async () => {
        onClose();
        await updateApp();
    };

    const conditionalButtons: SimpleButtonItem[] = [
        {
            show: canInstall && !isInstalled,
            label: 'Install app',
            icon: <Download className="h-4 w-4 mr-2" />,
            onClick: handleInstall,
        },
    ];

    return (
        <div className="flex flex-col gap-2.5">
            {conditionalButtons
                .filter((item) => item.show)
                .map((item) => (
                    <MenuItem key={item.label} delay={item.delay}>
                        <Button variant="outline" onClick={item.onClick} className={OUTLINE_BTN}>
                            {item.icon}
                            {item.label}
                        </Button>
                    </MenuItem>
                ))}

            <MenuItem delay={0.05}>
                <ThemeToggle />
            </MenuItem>
```

(Everything below the `ThemeToggle` `MenuItem` — Notification toggle, Test reminder, Update button, Log out — is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/HamburgerMenu/index.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ToolBar/HamburgerMenu/index.tsx packages/web/src/components/ToolBar/HamburgerMenu/index.test.tsx
git commit -m "refactor(web): drop page-scoped items from HamburgerMenu"
```

---

### Task 5: Wire `ActionsFab` into `ToolBar/index.tsx`

**Files:**
- Modify: `packages/web/src/components/ToolBar/index.tsx`
- Modify: `packages/web/src/components/ToolBar/index.test.tsx`

**Interfaces:**
- Consumes: `ActionItem` type and `ActionsFab` from `./ActionsFab` (Task 2); `hideTrigger` prop on `AddFromRecipeDrawer` (Task 1); simplified `ToolBarAppBar` (Task 3); simplified `HamburgerMenu` (Task 4).
- Produces: no change to `ToolBar`'s own public props — `ItemsPage`, `RecipeDetailPage`, `CalendarPage` need no changes.

- [ ] **Step 1: Update `ToolBar/index.test.tsx` mocks and add per-page `actionItems` tests**

In `packages/web/src/components/ToolBar/index.test.tsx`, the `react-router-dom` mock currently returns a fixed pathname for every test:

```tsx
vi.mock('react-router-dom', () => ({
    useLocation: () => ({ pathname: '/lists' }),
    useNavigate: () => mockNavigate,
}));
```

Change it to a hoisted, overridable mock so individual tests can control the current route:

```tsx
const { mockLogout, mockNavigate, mockUseToolBarState, mockHandleGoBack, mockUseLocation } = vi.hoisted(() => ({
    mockLogout: vi.fn(),
    mockNavigate: vi.fn(),
    mockHandleGoBack: vi.fn(),
    mockUseToolBarState: vi.fn(),
    mockUseLocation: vi.fn(() => ({ pathname: '/lists' })),
}));

vi.mock('react-router-dom', () => ({
    useLocation: mockUseLocation,
    useNavigate: () => mockNavigate,
}));
```

(This replaces the existing `vi.hoisted` block that only declared `mockLogout`, `mockNavigate`, `mockUseToolBarState`, `mockHandleGoBack` — add `mockUseLocation` to it and use it in the `react-router-dom` mock as shown.)

Replace the `ActionsFab`-less setup with a mock that renders the `actionItems` it's given, so tests can assert on their content:

```tsx
vi.mock('./ActionsFab', () => ({
    ActionsFab: ({ actionItems }: { actionItems: { show: boolean; label: string }[] }) => (
        <div data-testid="actions-fab">
            {actionItems
                .filter((item) => item.show)
                .map((item) => (
                    <span key={item.label}>{item.label}</span>
                ))}
        </div>
    ),
}));

vi.mock('./AddFromRecipeDrawer', () => ({
    AddFromRecipeDrawer: () => <div data-testid="add-from-recipe-drawer" />,
}));
```

Add a `beforeEach(() => { mockUseLocation.mockReturnValue({ pathname: '/lists' }); })` alongside the existing `mockUseToolBarState.mockReturnValue(...)` setup in the top-level `beforeEach`, so every existing test keeps its prior default behavior unless it overrides the pathname itself.

Add these new test cases to the `describe('ToolBar', ...)` block:

```tsx
    it('shows Items-page actions for the list owner', () => {
        mockUseLocation.mockReturnValue({ pathname: '/list/Groceries' });

        render(
            <ToolBar
                handleClearSelected={() => {}}
                handleRemoveAll={() => {}}
                currentListType={ListType.SHOPPING}
                currentList={{ title: 'Groceries', users: [], ownerId: 'user-1' }}
                listItems={[]}
            />
        );

        expect(screen.getByText('Add from Recipe')).toBeInTheDocument();
        expect(screen.getByText('Clear Selected')).toBeInTheDocument();
        expect(screen.getByText('Remove All')).toBeInTheDocument();
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });

    it('hides Manage Users for a non-owner on the Items page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/list/Groceries' });

        render(
            <ToolBar
                currentListType={ListType.SHOPPING}
                currentList={{ title: 'Groceries', users: [], ownerId: 'someone-else' }}
                listItems={[]}
            />
        );

        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
    });

    it('shows only Add to Shopping List on the Recipe detail page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/recipes/recipe-1' });

        render(<ToolBar onToggleSelectMode={() => {}} />);

        expect(screen.getByText('Add to Shopping List')).toBeInTheDocument();
        expect(screen.queryByText('Clear Selected')).not.toBeInTheDocument();
    });

    it('shows only Manage Labels on the Calendar page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/calendar' });

        render(<ToolBar />);

        expect(screen.getByText('Manage Labels')).toBeInTheDocument();
        expect(screen.queryByText('Add to Shopping List')).not.toBeInTheDocument();
    });

    it('shows no actions on the Friends page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/friends' });

        render(<ToolBar />);

        const fab = screen.getByTestId('actions-fab');
        expect(fab).toBeEmptyDOMElement();
    });
```

Add `import { ListType } from '@shoppingo/types';` to this test file's imports if it isn't already present (it isn't currently).

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/index.test.tsx`
Expected: the five new tests FAIL (`ToolBar/index.tsx` doesn't build `actionItems` yet, so the mocked `ActionsFab` always receives `undefined`/nothing meaningful). The pre-existing tests still PASS.

- [ ] **Step 3: Add imports and build `actionItems` in `ToolBar/index.tsx`**

Add to the import block (near the other lucide-react icons already imported by sibling files — `ToolBar/index.tsx` itself doesn't currently import any lucide icons, so add a new import line):

```tsx
import { ChefHat, CheckCheck, ShoppingCart, Tag, Trash2, Users } from 'lucide-react';
```

Add alongside the other relative imports:

```tsx
import { ActionsFab, type ActionItem } from './ActionsFab';
```

Inside the `ToolBar` component body, after the existing `isFriendsPage` computation (right after this block, which already exists):

```tsx
    const isItemsPage = location.pathname.includes('/list/');
    const isListsPage = location.pathname === '/';
    const isRecipesPage = location.pathname === '/recipes';
    const isRecipeDetailPage = location.pathname.includes('/recipes/');
    const isCalendarPage = location.pathname === '/calendar';
    const isFriendsPage = location.pathname === '/friends';
```

add:

```tsx
    const isOwner = !!(currentList && currentList.ownerId === userId);

    const actionItems: ActionItem[] = [
        {
            show: isItemsPage && !!currentList && !!listItems && currentListType === ListType.SHOPPING,
            label: 'Add from Recipe',
            icon: ChefHat,
            onClick: () => setIsAddFromRecipeDrawerOpen(true),
        },
        {
            show: isItemsPage && !!handleClearSelected,
            label: 'Clear Selected',
            icon: CheckCheck,
            onClick: () => handleClearSelected?.(),
            disabled: disableClearSelected,
        },
        {
            show: isItemsPage && !!handleRemoveAll,
            label: 'Remove All',
            icon: Trash2,
            onClick: () => handleRemoveAll?.(),
            disabled: disableClearAll,
            variant: 'destructive',
        },
        {
            show: isItemsPage && isOwner,
            label: 'Manage Users',
            icon: Users,
            onClick: () => setIsManageUsersOpen(true),
        },
        {
            show: isRecipeDetailPage && !!onToggleSelectMode,
            label: 'Add to Shopping List',
            icon: ShoppingCart,
            onClick: () => onToggleSelectMode?.(),
        },
        {
            show: isCalendarPage,
            label: 'Manage Labels',
            icon: Tag,
            onClick: () => setIsManageLabelsOpen(true),
        },
    ];
```

- [ ] **Step 4: Remove the recipe-picker + old right-group props from the `ToolBarAppBar` call**

Find the `<ToolBarAppBar ... />` invocation. Remove these props entirely (they no longer exist on the component after Task 3): `onClearSelected={handleClearSelected}`, `onRemoveAll={handleRemoveAll}`, `onToggleSelectMode={onToggleSelectMode}`, `disableClearSelected={disableClearSelected}`, `disableClearAll={disableClearAll}`, and the whole `recipePickerDrawer={...}` block:

```tsx
                                recipePickerDrawer={
                                    isItemsPage && currentList && listItems && currentListType === ListType.SHOPPING ? (
                                        <AddFromRecipeDrawer
                                            open={isAddFromRecipeDrawerOpen}
                                            onOpenChange={setIsAddFromRecipeDrawerOpen}
                                            listTitle={currentList.title}
                                            listItems={listItems}
                                        />
                                    ) : undefined
                                }
```

- [ ] **Step 5: Remove `onManageLabels` from the `HamburgerMenu` call**

Find the `<HamburgerMenu ... />` invocation inside `menuActive === 1 && (...)`. It currently reads:

```tsx
                                                    <HamburgerMenu
                                                        currentList={currentList}
                                                        userId={userId}
                                                        onManageUsers={() => {
                                                            setIsManageUsersOpen(true);
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                        onManageLabels={
                                                            isCalendarPage
                                                                ? () => {
                                                                      setIsManageLabelsOpen(true);
                                                                      setIsMenuOpen(false);
                                                                      setMenuActive(null);
                                                                  }
                                                                : undefined
                                                        }
                                                        onClose={() => {
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                        onLogout={() => {
                                                            void handleLogout();
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                    />
```

Replace with:

```tsx
                                                    <HamburgerMenu
                                                        onClose={() => {
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                        onLogout={() => {
                                                            void handleLogout();
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                    />
```

- [ ] **Step 6: Mount `ActionsFab` and the (now `hideTrigger`) `AddFromRecipeDrawer`**

Right after the closing `</div>` of the outer `<div className="fixed bottom-4 left-0 right-0 z-40 px-4">` nav wrapper (i.e. immediately before the `{/* ManageLabelsDrawer */}` comment), add:

```tsx
            <ActionsFab actionItems={actionItems} />

            {isItemsPage && currentList && listItems && (
                <AddFromRecipeDrawer
                    open={isAddFromRecipeDrawerOpen}
                    onOpenChange={setIsAddFromRecipeDrawerOpen}
                    listTitle={currentList.title}
                    listItems={listItems}
                    hideTrigger
                />
            )}

```

Add the import for `AddFromRecipeDrawer` if it isn't already imported at the top of the file (it already is, from the old center-drawer usage — verify it's still there and hasn't been accidentally removed while deleting the `recipePickerDrawer` block in Step 4).

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd packages/web && bunx vitest run src/components/ToolBar/index.test.tsx`
Expected: PASS.

- [ ] **Step 8: Type-check the whole web package**

Run: `bun run tsc --noEmit` (from repo root)
Expected: no errors. If `handleClearSelected`, `handleRemoveAll`, `disableClearSelected`, `disableClearAll`, `onToggleSelectMode` show as unused-variable errors anywhere, confirm they're still referenced inside the new `actionItems` array (they should be — this is just a sanity check that Step 3 wired them correctly).

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/components/ToolBar/index.tsx packages/web/src/components/ToolBar/index.test.tsx
git commit -m "feat(web): wire ActionsFab into ToolBar, remove nav-row action icons"
```

---

### Task 6: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Lint**

Run: `bun run lint:fix` (from repo root)
Expected: no errors after auto-fix; review any files it touched.

- [ ] **Step 2: Type-check**

Run: `bun run tsc --noEmit` (from repo root)
Expected: no errors.

- [ ] **Step 3: Full web test suite**

Run: `bun run --filter @shoppingo/web test -- run` (from repo root)
Expected: all tests pass, including every file touched in Tasks 1–5.

- [ ] **Step 4: Web build**

Run: `bun run --filter @shoppingo/web build` (from repo root)
Expected: build succeeds with no TypeScript or bundling errors.

- [ ] **Step 5: Manual smoke check**

Run `bun run start:with-mock` (or `start:web:with-mock` per root `package.json`), log in, and visually confirm on a real list page (`/list/:title`):
- Nav row is identical across Lists/Recipes/Friends/Calendar/Items/Recipe-detail pages (modulo the Calendar↔Back swap).
- The `+` FAB appears bottom-left only on pages with actions (Items, Recipe detail, Calendar) and is absent on Lists/Recipes/Friends.
- Tapping the FAB reveals the correct labeled actions per page, and each one works (Add from Recipe opens its drawer, Clear Selected/Remove All operate on the list, Manage Users/Manage Labels open their drawers).
- Menu (hamburger icon) still opens with only app-level settings (Theme, Notifications, Update/Install, Log out) — no page-specific items.

- [ ] **Step 6: Commit (if Step 1 produced lint-fix changes not already committed)**

```bash
git add -A
git commit -m "chore(web): lint fixes from toolbar FAB refactor"
```

(Skip this step if `lint:fix` made no changes.)
