# Shoppingo UI — how to build with it

A shadcn/ui component library styled with the Shoppingo brand (green primary, Montserrat).
Built with **Tailwind CSS v4** utility classes over CSS-variable design tokens. Components are
imported from `window.Shoppingo.*` and render real, shippable React.

## Setup & wrapping

- **No provider needed.** Components are self-contained (Radix + Tailwind). Just render them.
- **Fonts and tokens ship in `styles.css`** (its `@import` closure pulls in `_ds_bundle.css`).
  The brand font (Montserrat) and all tokens load from there — nothing else to wire.
- **Dark mode:** add `class="dark"` to any ancestor element. Every token flips automatically
  (light is the default). Do not hand-pick hex colors — use the token classes below so both
  themes stay correct.
- **Overlays** (`AlertDialog`, `Drawer`, `Popover`, `Select`) render through a portal and are
  controlled: pass `open` (or `defaultOpen`) plus the `*Trigger`/`*Content` parts, exactly as
  the per-component `.prompt.md` shows.

## Styling idiom — Tailwind v4 utilities over brand tokens

Style layout with Tailwind utility classes. For anything with brand meaning, use the **token
classes** (never raw colors) — these resolve to the Shoppingo palette and are dark-mode aware:

| Purpose | Classes |
|---|---|
| Primary action / brand green | `bg-primary` · `text-primary-foreground` |
| Secondary surface | `bg-secondary` · `text-secondary-foreground` |
| Muted / subtle text & fills | `bg-muted` · `text-muted-foreground` |
| Card / popover surfaces | `bg-card` · `bg-popover` · `text-card-foreground` |
| Hover / subtle accent | `bg-accent` · `text-accent-foreground` |
| Destructive / danger | `bg-destructive` · `text-white` |
| Borders | `border` · `border-border` |
| Radius | `rounded-md` · `rounded-lg` · `rounded-xl` (from `--radius`) |
| Type | `font-sans` (Montserrat) · `font-medium` · `text-sm` |

Equivalent CSS variables exist for inline styles: `var(--primary)`, `var(--muted-foreground)`,
`var(--border)`, `var(--radius)`, etc. Prefer the utility classes.

## Where the truth lives

- **`_ds_bundle.css`** — compiled Tailwind utilities + the `:root` / `.dark` token definitions.
  Read it before inventing class names; if a class isn't there, it won't style anything.
- **Per component:** `<Name>.d.ts` (the `<Name>Props` API contract) and `<Name>.prompt.md`
  (usage + composition). Compound components (Card, Select, Drawer, AlertDialog, Empty) are
  composed from their sub-parts — read the parent's prompt for the part list.

## Idiomatic snippet

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from 'window.Shoppingo';

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
```

`Button` variants: `default` (brand green), `secondary`, `outline`, `ghost`, `destructive`,
`link`; sizes `sm` · `default` · `lg` · `icon`.
