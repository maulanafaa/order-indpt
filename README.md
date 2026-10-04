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

## Screens and demo flags

| Route | Screen |
| --- | --- |
| `/` | Find a store: location permission, map with pins, list view, search |
| `/store/:slug` | Branch menu (`?item=salt-burger` opens the item sheet), cart sheet, login sheet, Leave store |
| `/store/:slug/info` | Store info: Details and Opening hours tabs |
| `/store/:slug/search` | Menu search |
| `/checkout` | Checkout for Pickup, Carhop and Dine-in, payment, car, schedule and promo sheets, order placed and payment result screens |

Scenario flags are read from the URL until the demo panel (Stage 6) sets them:

- `location=prompt|denied|granted` permission state on Find a store
- `near=riyadh|khobar|dubai|hail` where the demo user is (`hail` has no store nearby)
- `store=closed` forces the branch closed (Schedule order)
- `menu=error` shows the menu failed state with Try again
- `cart=demo` on a branch page fills the cart with the Figma items and opens it (at `/store/salt-u-walk` one item is sold out and two add-ons get removed)
- `user=new` logging in gives a user with nothing saved
- `payment=success|declined|insufficient|gateway|pending` result of paying by card or Apple Pay on the first try (cash always goes through; Try again and Check payment status then succeed)
- `checkout=soldout|paused|timefull|promo` what the store says when you tap Place order (`promo` needs a promo applied)

Put `payment=` and `checkout=` on the branch page URL (they are carried to checkout) or straight on `/checkout`.

Promo codes (seeds in `src/data/promos.json`): `SALT15` 15% off over 100, up to 30 off; `FRIESONUS` free Original Fries with a burger (Pickup and Dine-in); `CARHOP10` 10% off Carhop only; `SUMMER20` expired; anything else is not found.

Every fake network call (send code, verify, apply promo, save card or car, place order) waits 1 second so loading states show. Placed orders are saved to localStorage (`src/lib/orders.ts`) for order tracking.

Fake login (any +966 5X XXX XXXX number):

| Input | Result |
| --- | --- |
| `50 000 0000` | The code can't be sent |
| `59 999 9999` | Too many code requests |
| Code `000000` | Incorrect (3 tries, then code entry pauses) |
| Code `111111` | Expired |
| Any other 6 digits | Logged in, continue to checkout |

Try `/store/salt-u-walk`: Campfire Burger is sold out there, Fire Fries (on Salt Burger) and Extra Jalapeno (on Original Beef Slider) are unavailable add-ons.

The cart lives in `src/lib/cart.ts` and the signed-in user in `src/lib/auth.ts` (Zustand, saved to localStorage, so both survive a refresh). Cart lines hold item, quantity, chosen add-ons and kitchen note; sold out lines stay in the cart but are left out of the total.

The Find a store map uses OpenStreetMap standard tiles and its own drag, pinch, wheel and double-tap zoom (keyless, no map SDK, attribution shown on the map; check the OSM tile usage policy before real traffic). If tiles can’t load you see a plain grid with the pins.

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
