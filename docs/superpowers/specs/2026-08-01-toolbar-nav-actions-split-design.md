# Bottom Toolbar: Static Nav + Expandable Actions Panel

## Problem

The bottom `ToolBar` mixes three concerns in one row: primary navigation
(Lists/Recipes/Friends/Calendar), an app-level settings entry point (Menu),
and per-page contextual actions (Clear Selected, Remove All, Add from Recipe,
Add to Shopping List) — all crammed into the same left/center/right slots.
This makes the bar:

- **Cramped**: the right slot can hold Calendar + Clear Selected + Remove All
  + Menu simultaneously (ItemsPage), or Calendar + Add-to-shopping-list + Menu
  (RecipeDetailPage).
- **Unpredictable**: the left slot swaps from 3 nav icons to 1 back arrow on
  Items/Recipe-detail pages — the row's composition changes per page.
- **Unclear**: nothing distinguishes "go somewhere" (nav) from "do something
  to what I'm looking at" (page action) — they're visually identical icon
  buttons in the same row.

## Goals

- Bottom nav row has an identical, static icon set on every page.
- Per-page contextual actions move to a separate, clearly-labeled expandable
  panel, opened on demand — not permanently occupying the nav row.
- Reuse the existing slide-up panel mechanism (already built for the Menu)
  rather than building a second animation system.

## Non-goals

- No change to the center Add button's per-page context-aware behavior.
- No change to Menu's existing app-settings content (theme, notifications,
  install, update, logout) beyond removing the two page-specific items
  described below.
- No visual redesign of drawers (`AddItemDrawer`, `AddRecipeDrawer`, etc.) —
  only where their triggers live.

## Design

### 1. Nav row (static, every page)

```
[Lists] [Recipes] [Friends]        (+)        [Calendar|Back] [Actions?] [Menu]
```

- **Left** (`justify-self-start`): Lists, Recipes, Friends. Always these
  three, always in this order, never swapped for anything else.
- **Center** (`justify-self-center`): the existing context-aware Add trigger
  (`itemDrawer` / `listDrawer` / `recipeDrawer` / `ingredientDrawer` /
  `todoDrawer` / `friendDrawer`) — unchanged.
- **Right** (`justify-self-end`): three slots —
  1. `Calendar` nav icon, replaced by `Back` only on Items and
     Recipe-detail pages (the one exception, and it's a 1-for-1 icon swap,
     not a layout restructure).
  2. **Actions** trigger — new. Only rendered when the current page has 1+
     items in its `actionItems` list (see below). Icon: `SlidersHorizontal`.
     Opens the shared expand panel with Actions content.
  3. `Menu` — always present, always last. Opens the shared expand panel
     with Menu (settings) content. Unchanged trigger, same icon.

The left group and Menu never change. The only two things that ever vary are
the Calendar↔Back swap and the presence/absence of the Actions icon —  both
narrowly scoped, single-icon changes instead of the current wholesale row
swap.

### 2. Actions panel content, per page

Reuses `useToolBarState`'s existing slide-up `Card` + height-animation
mechanism (currently hardcoded to Menu content). That state generalizes from
a single `isMenuOpen`/`menuActive` pair to track *which* panel is open:

```ts
type ExpandPanel = 'menu' | 'actions' | null;
```

Only one panel is open at a time — opening Actions closes Menu and vice
versa, matching today's single-panel behavior.

| Page | `actionItems` |
|---|---|
| Items | Add from Recipe, Clear Selected, Remove All, Manage Users *(list owner only)* |
| Recipe detail | Add to Shopping List |
| Calendar | Manage Labels |
| Lists / Recipes / Friends | *(empty — Actions icon not rendered)* |

Each item has the same shape `HamburgerMenu`'s `SimpleButtonItem` already
uses: `{ show, label, icon, onClick, disabled?, variant? }`. Destructive
items (Remove All) keep the destructive button styling already used for
Logout in `HamburgerMenu`.

Menu content loses two items it currently carries, since they're page-scoped
rather than app-scoped:

- "Manage Users" (was: owner-only, Items page) → moves to Items' Actions panel.
- "Manage Labels" (was: Calendar page) → moves to Calendar's Actions panel.

Menu content after this change: Theme toggle, Notification toggle, Test
reminder button, Update/Install button, Log out. Pure app-level settings,
nothing page-specific.

### 3. Component changes

- **`useToolBarState`**: `isMenuOpen`/`menuActive` generalize to a single
  `ExpandPanel` state (`'menu' | 'actions' | null`) plus the open/close
  helpers. Existing consumers of the menu-open behavior get the same
  semantics, scoped to `panel === 'menu'`.
- **`ToolBarAppBar`**: right group updated to
  `[Calendar|Back]`, conditional `ActionsButton`, `Menu`. Takes a new
  `hasActions: boolean` prop (or derives it from `actionItems.length > 0`)
  to decide whether to render the Actions icon.
- **`ToolBar/index.tsx`**: builds `actionItems` per page (mirroring the
  existing `isItemsPage`/`isListsPage`/etc. branching already used to pick
  which center drawer renders), passes both `actionItems` and the existing
  `menuActive`-style callbacks down. Renders a new `ActionsPanel` component
  as the alternate content of the shared expand card (sibling to
  `HamburgerMenu`, same container).
- **`ActionsPanel`** (new, `ToolBar/ActionsPanel/`): renders `actionItems`
  as a list of buttons, same visual language as `HamburgerMenu`'s
  `SimpleButtonItem` rendering (can share the button-row styling/markup).
- **`AddFromRecipeDrawer`**: trigger moves from the app-bar center row into
  an `actionItems` entry ("Add from Recipe") that opens the same drawer —
  drawer component itself is unchanged, only relocates its trigger, closing
  the Actions panel first (same pattern `onManageUsers` already follows
  today when opening `ManageUsersDrawer`).
- **`onToggleSelectMode`** (Recipe detail "Add to shopping list") and
  **`onManageLabels`** (Calendar "Manage Labels") move from bar-right
  icons / `HamburgerMenu` respectively into `actionItems` entries.
- No prop changes needed on `ItemsPage`, `RecipeDetailPage`, `CalendarPage`
  — they already pass the callbacks `ToolBar` needs (`handleClearSelected`,
  `handleRemoveAll`, `onToggleSelectMode`, `onManageLabels` equivalent);
  `ToolBar` re-routes them into `actionItems` instead of directly onto
  `ToolBarAppBar` props.

### 4. Error handling / edge cases

- `disableClearSelected` / `disableClearAll` disabled states carry over
  unchanged onto the corresponding Actions panel buttons.
- Destructive styling (Remove All) preserved via the panel button's
  `variant="destructive"`, matching `HamburgerMenu`'s Logout button.
- Both panels (Menu, Actions) auto-close on navigation — existing behavior
  for Menu extends to Actions via the shared `ExpandPanel` state resetting
  on route change.
- If a page's `actionItems` all have `show: false` (e.g. non-owner on Items
  page with no other actions), the Actions icon does not render — same
  "hide if empty" rule applies to the filtered list, not just the static
  per-page list.

### 5. Testing

Update existing `ToolBar/index.test.tsx`, `ToolBar/ToolBarAppBar/index.test.tsx`,
`ToolBar/ToolBarButton/index.test.tsx` for:

- New right-group composition (Calendar/Back, conditional Actions, Menu).
- Actions icon hidden when `actionItems` is empty (Lists/Recipes/Friends
  pages) and shown when populated (Items/Recipe-detail/Calendar).
- Panel mutual exclusion: opening Actions while Menu is open closes Menu,
  and vice versa.
- Per-page `actionItems` content: Items (owner vs non-owner), Recipe detail,
  Calendar.
- Disabled/destructive states carry through to panel buttons
  (`disableClearSelected`, `disableClearAll`).

New test file for `ActionsPanel` component covering item rendering,
`show: false` filtering, and click-through to provided `onClick` handlers.
