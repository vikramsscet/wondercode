# WonderCode Design System

Playful and modern, friendly to children, calm for parents. Implemented in `apps/web`.

## Preview
Run `npm run dev:web` and open http://localhost:5173/design (development builds only; the route is not in production bundles).

## Tokens (`apps/web/src/styles/index.css`, Tailwind `@theme`)
| Group | Use |
|---|---|
| `brand-50..900` (violet) | Primary actions, links, headings |
| `sun`, `mint`, `coral` | Accents and status: warning/ideas, success, error/danger |
| `ink-50..900` (warm neutral) | Text, borders, backgrounds. Page background is `ink-50` |
| `rounded-card`, `shadow-soft` | Card radius and shadow |

Use token classes (`bg-brand-600`, `text-ink-600`), not raw Tailwind colours such as `slate` or `indigo`.

## Typography
Nunito (English) with Noto Sans Devanagari (Hindi), self-hosted through `@fontsource-variable`. No requests go to Google Fonts. Base size is 17px with 1.6 line height. Code uses the system monospace stack until the editor is added.

## Components (`components/ui`)
`Button` (primary, secondary, outline, ghost, danger; sm/md/lg; `loading`), `buttonClasses()` for link-styled buttons, `Card` (white, brand, sun), `TextField` (label, hint, error wired with `aria-*`), `Alert` (info, success, warning, error), `Badge`, `Dialog` (native `<dialog>`: focus trap, Esc, backdrop), `Spinner`, `LoadingState`, `Skeleton`.

## Accessibility rules
- Text and background pairs must reach WCAG AA (4.5:1). `src/styles/tokens.test.js` checks the pairs the components use; add a pair there when you add one.
- Interactive controls are at least 44px tall and share one focus ring (`:focus-visible`, defined globally).
- Errors use `role="alert"`; other messages `role="status"`. Animations stop under `prefers-reduced-motion`.
- The layout has a skip link, a labelled `<nav>`, and wraps cleanly on small screens.

## Not yet included
Avatar artwork, illustrations, icons, dark mode, Hindi UI strings (localization comes later), the code editor theme.
