# Mintmind design system

One place for the spacing scale and the reusable pieces. Prefer these over one-off classes.

## Spacing scale (Tailwind units)
| Step | Use |
|---|---|
| `2` | Tight groups: label + hint, chips, icon + text |
| `3` | Related items in a list or row of small tiles |
| `4` | **Default.** Form fields, card contents, grids of cards |
| `5` | **Page sections** (`space-y-5` between a page's blocks) and card padding on larger screens |
| `6` | Dialogs, empty states, large hero cards |

Card padding is `p-4 sm:p-5`. Dialog padding is `p-6` (`p-5` on phones). Never mix other values for the same role.

## Components
| Need | Use | File |
|---|---|---|
| Vertical rhythm | `<Stack gap={4}>` | `components/ui/layout.tsx` |
| Responsive grid | `<Grid cols={3} gap={4}>` | same |
| Card surface | `<Card>` (or `surface-card p-4 sm:p-5`) | same |
| Titled card | `<Panel title action>` | `components/wealth/kit.tsx` |
| Form in a dialog | `<FormDialog>` (uses `FormGrid`; add `className="full"` to span both columns) | `components/wealth/kit.tsx` |
| Labelled input | `<Field label hint error>` | `components/wealth/kit.tsx` |
| Group of controls | `<FieldSet legend>` (never a bare `<fieldset>`) | `components/ui/layout.tsx` |
| Scrollable pick list | `<ScrollList>` + `<ScrollListItem>` | same |
| Page title row | `<PageHeader>` | `components/wealth/kit.tsx` |
| Loading / empty | `<LoadingBlock>` / `<Empty>` | `components/wealth/kit.tsx` |
| Confirm | `<ConfirmDialog>` | `components/ui/confirm-dialog.tsx` |

## Rules that prevent layout bugs
- Grid and flex children need `min-w-0` or they can overflow. `Grid`, `FormGrid`, `FieldSet`, `ScrollList` and `Card` already do this.
- A bare `<fieldset>` ignores its container width; a global `fieldset { min-width: 0 }` guards it, but use `FieldSet`.
- Dialogs never scroll sideways (`overflow-x-hidden`). If something is wider than the dialog it is a bug in the content.
- Colours come from CSS variables (`bg-card`, `text-muted-foreground`, `border-border`). No hard-coded hex or palette colours.
