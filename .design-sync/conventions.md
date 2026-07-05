# IMapps UI — how to build with it

A shadcn/ui component library built with **Tailwind CSS v4** utility classes over
CSS-variable design tokens. Components are imported from `window.Shoppingo.*` and render
real, shippable React.

**The base is unthemed** — neutral monochrome tokens (black/white/grey). Brand it by
wrapping any subtree in a **theme class**; the components never change, only the token layer.

## Theming — wrap a subtree in a theme class

```tsx
<div className="theme-shoppingo">
  {/* everything here uses the Shoppingo brand: green primary, warm surfaces, Montserrat */}
</div>
```

Available themes (each sets colors + font for its subtree):

| Class | Look |
|---|---|
| *(none)* | Neutral — monochrome, system font. The unthemed default. |
| `theme-shoppingo` | Green primary, warm cream surfaces, Montserrat |
| `theme-jewellery` | Violet primary, cool blue-grey surfaces, Delius |
| `theme-rosegold` | Warm pink-gold primary, serif |
| `theme-ocean` | Teal/cyan primary, sans |

Themes nest and compose with dark mode. **Dark mode:** add `class="dark"` to any ancestor —
works with or without a theme. Combine freely: `<div class="dark theme-jewellery">`.

## Styling idiom — Tailwind v4 utilities over tokens

Style layout with Tailwind utility classes. For anything with brand meaning use the **token
classes** (never raw colors) — they resolve to whatever theme is active and are dark-mode aware:

| Purpose | Classes |
|---|---|
| Primary action | `bg-primary` · `text-primary-foreground` |
| Secondary surface | `bg-secondary` · `text-secondary-foreground` |
| Muted / subtle | `bg-muted` · `text-muted-foreground` |
| Card / popover | `bg-card` · `bg-popover` · `text-card-foreground` |
| Hover / accent | `bg-accent` · `text-accent-foreground` |
| Destructive | `bg-destructive` · `text-white` |
| Borders | `border` · `border-border` |
| Radius | `rounded-md` · `rounded-lg` · `rounded-xl` (from `--radius`) |
| Type | `font-sans` · `font-medium` · `text-sm` |

CSS-variable equivalents for inline styles: `var(--primary)`, `var(--muted-foreground)`,
`var(--border)`, `var(--radius)`, `var(--font-sans)`. Prefer the utility classes.

## Where the truth lives

- **`_ds_bundle.css`** — compiled Tailwind utilities + the neutral `:root` / `.dark` tokens
  **and the scoped `.theme-*` brand blocks** (all in this one file, reached via `styles.css`).
  There are no separate theme files to import — just apply the `theme-*` class.
- **Per component:** `<Name>.d.ts` (the `<Name>Props` contract) and `<Name>.prompt.md`
  (usage + composition). Compound components (Card, Select, Drawer, AlertDialog, Empty) are
  composed from their sub-parts — read the parent's prompt for the part list.

## Idiomatic snippet

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from 'window.Shoppingo';

<div className="theme-shoppingo">
  <Card className="w-80">
    <CardHeader>
      <CardTitle>Groceries</CardTitle>
      <CardDescription className="text-muted-foreground">12 items · 4 checked</CardDescription>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">Milk, eggs, bread, spinach…</CardContent>
    <CardFooter className="gap-2">
      <Button size="sm">Add item</Button>
      <Button size="sm" variant="outline">Share</Button>
    </CardFooter>
  </Card>
</div>
```

`Button` variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`;
sizes `sm` · `default` · `lg` · `icon`.
