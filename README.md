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
| `npm run check:images` | Lists menu items and stores with no photo in Supabase yet |
| `npm run images:upload` | Uploads photos from `photos/` to Supabase Storage |

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
photos/menu           drop folder: {item-slug}.webp, square 800 x 800, under 200 KB
photos/stores         drop folder: {store-slug}.webp, 1200 x 600, under 200 KB
                      (not deployed; npm run images:upload sends them to Supabase)
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

Testing guide with demo phone numbers, stores, links and every error case: [TESTING.md](TESTING.md).

| Route | Screen |
| --- | --- |
| `/` | Find a store: location permission, map with pins, list view, search |
| `/store/:slug` | Branch menu (`?item=salt-burger` opens the item sheet), cart sheet, Leave store |
| `/store/:slug/info` | Store info: Details and Opening hours tabs |
| `/store/:slug/search` | Menu search |
| `/checkout` | Checkout for Pickup, Carhop and Dine-in: time dropdowns, car field, Apple Pay or inline card form, INDPT balance, expandable order summary, order placed, error sheets and blocking screens |

Scenario flags are read from the URL until the demo panel (Stage 6) sets them:

- `location=prompt|denied|granted` permission state on Find a store (the floating Location switch also turns it on and off)
- `near=riyadh|khobar|dubai|hail` where the demo user is (`hail` has no store nearby)
- `store=closed|soon|paused` forces the branch closed (Schedule order), opening in 25 min (Schedule order) or not taking online orders (See menu, adds disabled)
- `order=scheduled|placed|preparing|ready|delivering|done|multi` shows an active order on the branch page (card, or swipeable cards for several; `delivering` is a Carhop order)
- `menu=error` shows the menu failed state with Try again
- `cart=demo` on a branch page fills the cart with the Figma items and opens it (at `/store/salt-u-walk` one item is sold out and two add-ons get removed)
- `user=new` logging in gives a user with nothing saved
- `payment=success|declined|insufficient|gateway|offline|error|pending` result of paying by Apple Pay or card on the first try (pending is a full screen, the rest are bottom sheets; Try again and Check payment status then succeed)
- `applepay=off` no Apple Pay on this device: the card form shows inline
- `balance=partial|full` INDPT balance pays SAR 40 or the whole order
- `demo=off` turns off the built-in demo branches (`src/lib/demoBranches.ts`): active Carhop, Pickup, several Pickup and Dine-in orders, a just picked up order, opening soon and closed branches. See TESTING.md, Demo branches
- `checkout=soldout|paused|timefull` what the store says when you tap Place order (paused is a full screen, the rest are bottom sheets)

Put `payment=`, `checkout=`, `applepay=` and `balance=` on the branch page URL (they are carried to checkout) or straight on `/checkout`.

Promo codes (seeds in `src/data/promos.json`, not shown at checkout until the next phase): `SALT15` 15% off over 100, up to 30 off; `FRIESONUS` free Original Fries with a burger (Pickup and Dine-in); `CARHOP10` 10% off Carhop only; `SUMMER20` expired; anything else is not found.

Every fake network call (send code, verify, apply promo, save card or car, place order) waits 1 second so loading states show. Placed orders are saved to localStorage (`src/lib/orders.ts`) and open on the Order detail page (`/order/:id`). Demo branch orders come from `src/lib/demoOrders.ts`; statuses picked in the Order status sheet and I'm here details are kept in `src/lib/orderUpdates.ts`.

Fake login, on checkout under Verify your number (any +966 5X XXX XXXX number):

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

## Supabase

The app reads stores, hours, services, menu, availability and promos from the
Supabase project `order-indpt` at boot (`src/lib/catalog.ts`). If Supabase is
unreachable, slower than 4 seconds, or not seeded yet, it uses the bundled
JSON in `src/data` instead, so the prototype always runs.

- Seed or refresh the catalog: `npm run db:seed-sql`, then paste
  `supabase/seed.sql` into the Supabase SQL editor and run it. User data
  (profiles, cars, cards, orders) is not touched.
- Login: the code rules are still fake (see the table above), but a passing
  code calls the edge function `phone-login` (`supabase/functions/phone-login`),
  which creates or finds a real account for that number and returns a one-time
  token the app exchanges for a session. A first login creates the profile:
  the demo profile (name, two cars, three cards) or an empty one with
  `user=new`. Profile, cars, cards and placed orders are then saved in
  Supabase, readable only by their owner (row level security). If Supabase
  can't be reached, the login falls back to this device only.
- Config: the project URL and publishable key are defaults in
  `src/lib/supabase.ts`. Override them with `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, or set `VITE_SUPABASE_URL=off`
  to skip Supabase.

## Photos

Menu photos and store covers live in the public Supabase Storage bucket
`images` (`menu/{item-slug}.webp`, `stores/{store-slug}.webp`). The app builds
each URL from the slug (`menuImage` and `storeImage` in `src/lib/format.ts`),
so a new photo shows up on the next page load, with no code change or
redeploy. A missing photo shows the grey placeholder. Icons, the logo and the
favicon stay in the project (`src/icons`, `src/assets/brand`, `public`).

| | Menu photo | Store cover |
| --- | --- | --- |
| Name | `{item-slug}.webp` | `{store-slug}.webp` |
| Size | 800 x 800 | 1200 x 600 |
| Format | WebP, under 200 KB (the bucket refuses anything else) | same |

Adding photos:

1. `npm run check:images` prints every missing photo with the file name it needs.
2. Export, crop and convert to WebP (about quality 80), e.g. with squoosh.app
   or `cwebp -q 80 in.jpg -o salt-burger.webp`.
3. Put the files in `photos/menu/` or `photos/stores/`.
4. `npm run images:upload`. It needs the secret key once: copy it from the
   Supabase dashboard (Project Settings > API Keys) into `.env.local` as
   `SUPABASE_SECRET_KEY=...`. Git ignores this file; never put the key in app code.

Or upload by hand in the Supabase dashboard: Storage > `images` > `menu` or
`stores` folder. Uploading a file with the same name replaces it (browsers may
keep the old one for up to an hour).

The files in `photos/` are not committed: the bucket is the source of truth.
