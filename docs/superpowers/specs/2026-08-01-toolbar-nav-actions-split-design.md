# Bottom Toolbar: Static Nav + Actions Speed-Dial FAB

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
  surface, opened on demand — not permanently occupying the nav row.
- The presence of page actions must be discoverable without prior knowledge
  — not hidden behind a generic icon a user has no reason to tap.

## Design decision: FAB speed-dial, not a nav-row icon

An earlier version of this design put a third icon ("Actions") into the nav
row's right slot, opening a slide-up panel shared with Menu. Prototyping that
against a real page surfaced a discoverability problem: the icon looks like
any other toolbar button, so there's no cue that tapping it reveals page
actions — a user switching between nav tabs has no way to know Clear
Selected / Add from Recipe / etc. exist at all.

Prototyped three alternatives (vertical speed-dial FAB, horizontal
mini-drawer FAB, radial fan speed-dial) as a floating action button
independent of the nav row entirely. The vertical speed-dial won: a
persistently-visible `+` FAB, bottom-left, is itself the discoverability cue
(it's obviously "more stuff lives here"), and tapping it stacks labeled
action buttons upward — no ambiguity about what each one does, no icon
guessing.

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
[Lists] [Recipes] [Friends]        (+)        [Calendar|Back] [Menu]
```

- **Left** (`justify-self-start`): Lists, Recipes, Friends. Always these
  three, always in this order, never swapped for anything else.
- **Center** (`justify-self-center`): the existing context-aware Add trigger
  (`itemDrawer` / `listDrawer` / `recipeDrawer` / `ingredientDrawer` /
  `todoDrawer` / `friendDrawer`) — unchanged.
- **Right** (`justify-self-end`): two slots —
  1. `Calendar` nav icon, replaced by `Back` only on Items and
     Recipe-detail pages (the one exception, and it's a 1-for-1 icon swap,
     not a layout restructure).
  2. `Menu` — always present, always last. Opens the existing slide-up panel
     with Menu (settings) content. Unchanged trigger, same icon.

The nav row carries no page-action affordance at all — actions live entirely
in the separate Actions FAB (below). The only thing that ever varies in the
row itself is the Calendar↔Back swap, a narrowly scoped 1-for-1 icon change.

### 2. Actions FAB, per page

A standalone floating action button, independent of the nav card:
`fixed bottom-28 left-4`, positioned just above and to the left of the main
toolbar card. Only rendered when the current page's `actionItems` list has
1+ visible entries — absent entirely on Lists/Recipes/Friends.

- **Closed state**: a `size-14` circular `+` button (`bg-fuchsia-600` in the
  prototype — final color TBD against the app's primary palette).
- **Open state**: tapping it rotates the `+` into an `×` and stacks each
  action above it as a smaller circular icon button with a label pill to its
  left, staggered in with a spring animation (fastest at the bottom, nearest
  the FAB).
- Tapping the FAB again, tapping an action, or navigating away collapses it.
- Independent of the Menu panel's open state — no shared mutual-exclusion
  requirement, since they occupy different screen regions (bottom-left FAB
  vs. the nav card's center-anchored slide-up). Both still auto-close on
  route change.

| Page | `actionItems` |
|---|---|
| Items | Add from Recipe, Clear Selected, Remove All, Manage Users *(list owner only)* |
| Recipe detail | Add to Shopping List |
| Calendar | Manage Labels |
| Lists / Recipes / Friends | *(empty — FAB not rendered)* |

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

- **`useToolBarState`**: unchanged — `isMenuOpen`/`menuActive` continue to
  govern only the Menu panel, exactly as today. No generalization needed
  since the FAB manages its own open state independently.
- **`ToolBarAppBar`**: right group simplifies to `[Calendar|Back]`, `Menu` —
  net removal of the three action buttons it currently renders
  conditionally (`onClearSelected`, `onRemoveAll`, the Recipe-detail
  "Add to shopping list" button), with no replacement icon added in their
  place.
- **`ActionsFab`** (new, `ToolBar/ActionsFab/`): self-contained component
  owning its own `open` boolean state. Takes `actionItems` as a prop, renders
  nothing when the filtered (`show: true`) list is empty. Renders the `+`/`×`
  FAB and, on open, the staggered vertical stack of action buttons. Closes
  itself when an action is clicked or the route changes.
- **`ToolBar/index.tsx`**: builds `actionItems` per page (mirroring the
  existing `isItemsPage`/`isListsPage`/etc. branching already used to pick
  which center drawer renders), passes the array to `ActionsFab`, mounted as
  a sibling of the toolbar `Card` (not inside it — the FAB is positioned
  independently, `fixed bottom-28 left-4`, above and outside the nav card).
- **`AddFromRecipeDrawer`**: trigger moves from the app-bar center row into
  an `actionItems` entry ("Add from Recipe") that opens the same drawer —
  drawer component itself is unchanged, only relocates its trigger, closing
  the FAB first (same pattern `onManageUsers` already follows today when
  opening `ManageUsersDrawer`).
- **`onToggleSelectMode`** (Recipe detail "Add to shopping list") and
  **`onManageLabels`** (Calendar "Manage Labels") move from bar-right icons /
  `HamburgerMenu` respectively into `actionItems` entries.
- No prop changes needed on `ItemsPage`, `RecipeDetailPage`, `CalendarPage`
  — they already pass the callbacks `ToolBar` needs (`handleClearSelected`,
  `handleRemoveAll`, `onToggleSelectMode`, `onManageLabels` equivalent);
  `ToolBar` re-routes them into `actionItems` instead of directly onto
  `ToolBarAppBar` props.

### 4. Error handling / edge cases

- `disableClearSelected` / `disableClearAll` disabled states carry over
  unchanged onto the corresponding FAB action buttons.
- Destructive styling (Remove All) preserved via the action button's
  destructive color treatment, matching `HamburgerMenu`'s Logout button
  styling intent (red).
- The FAB auto-closes on route change, same as Menu does today.
- If a page's `actionItems` all have `show: false` (e.g. non-owner on Items
  page with no other actions), the FAB does not render at all — the
  "hide if empty" rule applies to the filtered list, not just the static
  per-page list.
- FAB position (`bottom-28 left-4`) must clear the main toolbar card at all
  supported viewport widths — verify no overlap with the card's left-side
  nav icons (Lists/Recipes/Friends, or Back) at narrow screens during
  implementation.

### 5. Testing

Update existing `ToolBar/index.test.tsx`, `ToolBar/ToolBarAppBar/index.test.tsx`
for the simplified right-group composition (Calendar/Back, Menu only — no
Actions icon).

New test file for `ActionsFab` covering:

- Not rendered when `actionItems` (post-`show` filtering) is empty.
- Rendered closed (just the `+` FAB) when populated.
- Expands to show all visible items on tap, collapses on second tap.
- Clicking an item calls its `onClick` and collapses the FAB.
- Per-page `actionItems` content: Items (owner vs non-owner), Recipe detail,
  Calendar.
- Disabled/destructive states carry through to the rendered buttons
  (`disableClearSelected`, `disableClearAll`).
