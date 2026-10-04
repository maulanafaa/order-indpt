# order-indpt

Clickable prototype of the SALT order-ahead flow (KSA), mobile web.
No backend: mock JSON data, state in the browser. Built with Vite, React 19,
TypeScript, React Router, Tailwind v4 and Zustand.

Design source: Figma file **Pickup Ordering · Mobile Web** (Foundations and
Components pages). Project rules for Claude live in `CLAUDE.md`.

## Run it on your Mac

You need Node 20.19 or newer (`node -v`).

```bash
npm install        # first time, and after pulling new dependencies
npm run dev        # http://localhost:5173
```

Open **http://localhost:5173/components** to review every UI component and
state. Use a 390 px wide window (or Chrome device mode, iPhone 12/13/14) to
compare with Figma.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | oxlint (warnings fail) and a TypeScript check |
| `npm run scrape` | Fetches stores and menus and writes `src/data` (see below) |
| `npm run check:images` | Lists menu items and stores with no photo yet |

## Deploy (GitHub to Netlify)

1. Create an empty **private** repo on GitHub, e.g. `order-indpt`.
2. Push from this folder:
   ```bash
   git init
   git add .
   git commit -m "Stage 1: setup and foundations"
   git branch -M main
   git remote add origin git@github.com:<you>/order-indpt.git
   git push -u origin main
   ```
3. In Netlify: **Add new site > Import from Git**, pick the repo. Build
   settings come from `netlify.toml` (`npm run build`, publish `dist`,
   Node 20). Every push to `main` deploys; every pull request gets a preview
   link.
4. Optional: rename the site to `order-indpt.netlify.app` and keep it public.

`netlify.toml` sends every path to `index.html`, so shared links like
`/order/SLT-24091` open directly instead of showing a 404.

## Folders

```
src/routes            one file per page
src/components/ui     pieces that mirror Figma components
src/components/flows  screen-specific pieces (CartSheet, PaymentSheet...)
src/components/layout AppFrame (390 px column) and placeholders
src/icons             SVG icons exported from Figma (index.ts lists them)
src/data              JSON tables + schema.ts (scraped and seed files)
src/lib               format.ts, scenarios.ts, store hooks
src/tokens            colours, type and radius from the Figma variables
public/images/menu    {item-slug}.webp, square 800 x 800, under 200 KB
public/images/stores  {store-slug}.webp, 1200 x 600, under 200 KB
```

## Data pipeline

`npm run scrape` fetches the real stores and menu, normalises them into the
tables below, checks every row with zod (`src/data/schema.ts`) and writes
`src/data/*.json`. Run it on your Mac (it needs normal internet access) and
commit the JSON. The prototype never calls these sites at runtime.

```bash
npm run scrape                 # fetch everything (about 2 to 4 minutes)
npm run scrape -- --offline    # re-run from the saved raw responses, no network
npm run scrape -- --fixtures   # run from the small real sample in scripts/scrape/fixtures
```

Where each table comes from:

| File | Source |
| --- | --- |
| `stores.json` | Store locator page (locations.findsalt.com): all 43 stores, from the `locations` list in its HTML |
| `storeHours.json` | KSA: order.indpt.com menu `operating_hours`. UAE: qlub menu `availabilities`. Stores with no ordering link get default hours |
| `storeServices.json` | No source has this. Seeded from `scripts/scrape/overrides.ts` to cover the Figma cases |
| `categories.json`, `items.json` | order.indpt.com menus of the 8 KSA stores with an ordering link, merged by POS item id. Prices in SAR (the most common price across stores) |
| `items.json` description, allergens | qlub (UAE) product details, matched by item name |
| `modifierGroups.json`, `modifiers.json` | qlub product add-ons, attached to the matching KSA item. Add-on prices use the KSA price of the same-named item where there is one |

Endpoints used (all public JSON, no login):

- `order.indpt.com/api/proxy/settings/{slug}/{branchId}` and `/api/proxy/menu/{slug}/{branchId}`
- `api-ae.qlub.cloud/v1/menu/{path}/menu`, `/{menuId}/category/{catId}?scrollId=N`, `/{menuId}/product/{id}`

Things that are not in any source: calories (always `null`), best sellers
(hand-picked in `overrides.ts`), and order methods per store (seeded in
`overrides.ts`). Edit `scripts/scrape/overrides.ts` to rename categories or
stores, change best sellers, or change which store supports which order method.
Raw responses are saved to `scripts/scrape/.cache/raw.json` (not committed).

Hand-written seed files, checked by every scrape run:

- `storeAvailability.json`: sold out items and unavailable add-ons per store
- `user.json`: an existing user (saved mada card, Toyota Land Cruiser RKD 4821) and a new user with nothing saved
- `orders.json`: one picked-up order and one cancelled and refunded order
- `promos.json`: `SALT15` (valid), `SUMMER20` (expired), `CARHOP10` (Carhop only)

## Design tokens

Colours are CSS variables in `src/index.css` (`@theme`), named after the
Figma variables, so `surface/muted` is `bg-surface-muted` and
`text/secondary` is `text-text-secondary`. Tailwind's default palette is
switched off: components can only use Figma tokens. Text styles are
utility classes with the Figma names: `display`, `title-xl` ... `product-m` (Overline is `overline-text`, because Tailwind already has an `overline` class).

Icons: `<Icon name="bag" />` uses the Figma exports. `lucide-react` is
installed only as a stand-in for any icon not exported yet.

Currency: always `<Price amount={43} />` (or `<SarIcon />`). Never type the
riyal character.
