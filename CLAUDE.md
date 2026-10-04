# order-indpt

Clickable prototype of SALT café order-ahead (KSA), mobile web. No backend:
mock JSON data, state in Zustand persisted to localStorage. Deployed to
Netlify from a private GitHub repo. English only for now; Arabic RTL later.

## Stack
Vite + React 19 + TypeScript, React Router, Tailwind v4, Zustand,
@fontsource (Barlow Semi Condensed, Figtree), vite-plugin-svgr.

## Folders
src/routes        one file per page
src/components/ui reusable pieces that mirror Figma components
src/components/flows  screen-specific pieces (CartSheet, PaymentSheet...)
src/icons         SVG exports from Figma (lucide-react only as a stand-in)
src/data          stores, menu, orders, user, promos as JSON
src/lib           scenarios.ts, format.ts, store hooks
src/tokens        colours, type, radius from Figma variables
public/images/menu/{item-slug}.webp, public/images/stores/{store-slug}.webp

## Design rules (from Figma)
- Mobile frame 390 px wide; centre it on desktop with a grey surround.
- Black and white UI. Green = success, orange = promo, amber = warning,
  red = errors only. Use token names, never raw hex in components.
- Titles and every food or drink name: Barlow Semi Condensed
  (Product/L 18, Product/M 16). Body text: Figtree.
- Currency: always the <SarIcon/> SVG before the amount. Never type the
  riyal character.
- Bottom sheets: no corner radius, 55% black overlay, close button top right.
- Buttons: Primary, Secondary, Tertiary, Ghost, Destructive, Disabled;
  every async button has a Loading state (spinner, same width).
- Quantity stepper shows a trash icon at 1 (red on outline, white on solid).
- Unavailable things are disabled, never hidden, unless the branch does not
  support them at all. Exception: the Best Seller section only shows items
  the branch can sell today (sold out items stay, disabled, in their category).
- Copy: plain and short. Never use the em dash character.

## Data rules
- Prices are numbers in SAR. Format with formatPrice().
- Images resolve from the item or store slug; missing image = placeholder.
- All edge cases are driven by src/lib/scenarios.ts (URL params + demo panel).

## Done means
npm run build and npm run lint pass, no console errors, and the screens
match Figma at 390 px.