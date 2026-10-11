# Testing the order-indpt prototype

Everything you need to walk through the prototype and force each edge case.
Links assume the dev server (`npm run dev`) at `http://localhost:5173`. On a
deployed site, swap the host and keep the path and flags.

Use a 390 px wide window (Chrome device mode, iPhone 12/13/14) to compare with
Figma.

## Quick links

| What | Link |
| --- | --- |
| Find a store (map, Riyadh) | http://localhost:5173/ |
| Branch menu | http://localhost:5173/store/salt-u-walk |
| Cart with every Figma case (sold out, removed add-ons) | http://localhost:5173/store/salt-u-walk?cart=demo |
| Item sheet open | http://localhost:5173/store/salt-u-walk?item=salt-burger |
| Store info | http://localhost:5173/store/salt-u-walk/info |
| Menu search | http://localhost:5173/store/salt-u-walk/search |
| Checkout (needs a cart and a login) | http://localhost:5173/checkout |
| Component gallery | http://localhost:5173/components |

Fastest full run: open the cart demo link, tap **Checkout**, log in with
`55 123 4567`, tap **Send code**, enter `123456` and tap **Verify**. You land on
checkout; then place the order. Refresh at any point: the cart and login stay.

## Demo credentials at a glance

Nothing here is real: no SMS is sent and no card is charged.

| What | Value |
| --- | --- |
| Phone number (demo user Noura) | `55 123 4567` |
| Fresh phone numbers (first-login state) | `51 000 0001`, `51 000 0002`, ... |
| Phone: code can't be sent | `50 000 0000` |
| Phone: too many code requests | `59 999 9999` |
| Code that logs you in | any 6 digits, e.g. `123456` |
| Code: incorrect / expired | `000000` / `111111` |
| Test card (works) | `4417 1234 5678 4417`, expiry `08/29`, CVV `123` (detected as mada) |
| Card: number incomplete / expired | `4417 1234 5678 441` / expiry `08/24` |
| Empty profile on first login | add `user=new` to the URL |

## Logging in

The phone login is fake: no SMS is sent. Enter any Saudi mobile number
(9 digits starting with 5, after the fixed +966) and any 6 digit code.

| Phone number | What happens |
| --- | --- |
| `55 123 4567` | Normal number (the demo user Noura uses it, but any number works) |
| `50 000 0000` | The code can't be sent (connection problem) |
| `59 999 9999` | Too many code requests (10 minute wait) |

| Code | What happens |
| --- | --- |
| `000000` | Incorrect. After 3 wrong codes, code entry pauses for 15 minutes |
| `111111` | Expired |
| Any other 6 digits, e.g. `123456` | Logged in, continue to checkout |

Behind the fake code, each number gets a real Supabase account:

- **First login with a number** creates the demo profile: name Noura Al Qahtani
  and 2 cars (Toyota Land Cruiser RKD 4821, Hyundai Sonata SLM 2260). Saved
  payment methods are drafted for the next phase: checkout offers Apple Pay and
  a card typed in at checkout only.
- **First login with `user=new` in the URL** creates an empty profile: no name,
  no cars. Use a number you haven't logged in with before, e.g.
  http://localhost:5173/store/salt-u-walk?cart=demo&user=new
- **Logging in again with the same number** brings back that number's saved
  profile, cars and orders, on any browser.

Tip: use a fresh number (e.g. `51 000 0001`, `51 000 0002`, ...) whenever you
want to see the first-login state again.

### Logging out

There is no log out button yet. To start over as a guest, open the browser
console on the prototype and run:

```js
Object.keys(localStorage).filter(k => k.startsWith('order-indpt') || k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)); location.reload()
```

This also clears the cart and checkout choices.

## Demo branches

Each branch below shows one case on its own, with no URL flag. Riyadh branches
are around you by default; for the Eastern Province ones add `?near=khobar` on
Find a store (http://localhost:5173/?near=khobar&location=granted). Add `demo=off` to any link to
turn these off.

| Case | Branch | Link | What you see |
| --- | --- | --- | --- |
| Open, nothing going on | SALT U Walk (Riyadh) | http://localhost:5173/store/salt-u-walk | Clean branch for every flag below (cart demo, payment results) |
| Active Carhop order | SALT SAAD Square (Riyadh) | http://localhost:5173/store/salt-saad-square | Being prepared, #48310. Green dot on its map pin |
| Active Pickup order | SALT Riyadh Park Mall (Riyadh) | http://localhost:5173/store/salt-riyadh-park-mall | Ready to collect, #48201. Green dot on its map pin |
| Several active Pickup orders | SALT Nakheel Mall (Riyadh) | http://localhost:5173/store/salt-nakheel-mall-riyadh | Two swipeable cards: Ready to collect #51930, Being prepared #51947. Scroll down: the pill says 2 active orders and opens the Your active orders sheet |
| Active Dine-in order | SALT Al Bahar Resort (Khobar) | http://localhost:5173/store/salt-al-bahar-resort-khobar | Order placed, #60412, waiting for confirmation |
| Order just picked up | SALT Al Ula | http://localhost:5173/store/salt-al-ula | Enjoy your meal!, #70118 |
| Opening soon | SALT Olaya (Khobar) | http://localhost:5173/store/salt-olaya-khobar | Amber "Opens at ... · in 25 min", Order ahead. Checkout offers tomorrow's times |
| Closed, schedule order | SALT West Field (Dammam) | http://localhost:5173/store/salt-west-field | Grey "Closed · Opens tomorrow at ...", Schedule order. Checkout offers tomorrow's times only |
| Online ordering paused | SALT JAKS Riyadh | http://localhost:5173/store/salt-jaks-riyadh | See menu, every add button disabled, no cart bar, no upsell |

The orders on these branches are examples for the banner, pill and sheet; tapping
one opens the order page placeholder. Real orders you place show the same way at
the branch you ordered from.

### Other stores worth testing

| Store | Link | What's special |
| --- | --- | --- |
| SALT U Walk (Riyadh) | http://localhost:5173/store/salt-u-walk | Campfire Burger and Mango Softie sold out; Fire Fries (on Salt Burger) and Extra Jalapeno Sliced (on Original Beef Slider) unavailable |
| SALT Riyadh Park Mall | http://localhost:5173/store/salt-riyadh-park-mall | Pickup only (no Carhop, no Dine-in); Truffle Beef Slider sold out; Extra Kewpie Mayo unavailable |
| SALT Olaya (Khobar) | http://localhost:5173/store/salt-olaya-khobar | Carhop paused (shown disabled); Spanish Latte (Cold) sold out |
| SALT SAAD Square | http://localhost:5173/store/salt-saad-square | Pickup paused |
| SALT Nakheel Mall (Riyadh) | http://localhost:5173/store/salt-nakheel-mall-riyadh | No Dine-in |
| SALT Al Haram (Makkah) | http://localhost:5173/store/salt-al-haram-makkah | No Carhop |
| SALT Al Ula | http://localhost:5173/store/salt-al-ula | Closest store when you are in Ha'il (`near=hail`) |

## Order detail

Open any active order card on a branch, or go straight to these links. The
status hero opens the Order status sheet. **Prototype control:** tap any step
in that sheet to set the order to that status (Order placed, Preparing,
Ready, Picked up / Collected / Delivered to your car). Changes are kept in this
browser.

| Case | Link | What you see |
| --- | --- | --- |
| Pickup, ready to collect (green) | http://localhost:5173/order/SLT-48201 | Branch with Directions |
| Pickup, being prepared, paid partly with INDPT balance | http://localhost:5173/order/SLT-51947 | Payment: INDPT balance 40.00 and mada for the rest |
| Pickup, ready (second order at the same branch) | http://localhost:5173/order/SLT-51930 | |
| Carhop, being prepared | http://localhost:5173/order/SLT-48310 | Your car with Edit, sticky I'm here bar |
| Dine-in, order placed | http://localhost:5173/order/SLT-60412 | Arrival row first: Dine-in · arriving at ..., "Prep starts at ..." |
| Just picked up, paid fully with balance | http://localhost:5173/order/SLT-70118 | White hero "Enjoy your meal!" for 30 minutes, then "Picked up" with the date |
| Past order, picked up | http://localhost:5173/order/SLT-23877 | Order number row, no chevron on the hero |
| Past order, cancelled and refunded | http://localhost:5173/order/SLT-24012 | Light red hero, Refund card, Status Refunded |

**Carhop I'm here** (SLT-48310): tap I'm here. You are about 7 km away by
default, so "You seem to be ... away" opens first (Get directions, or I'm here
anyway). Add `?near=` with a closer place, or tap I'm here anyway, to reach
"Where are you parked?": edit the car, add a parking spot, then tap I'm here,
bring my order (1 second sending state). The hero turns to "On its way to you",
the sticky bar goes away and the location card shows the parking spot and a
disabled "Arrived at ..." button. Set the status back to Ready in the Order
status sheet to try again.

## Order status cases

Every status a customer can meet, and where to see it. `U` is
http://localhost:5173/store/salt-u-walk?cart=demo (log in, tap Checkout, then Place order).

| Status | Where | How to see it |
| --- | --- | --- |
| Order placed (waiting for confirmation) | Branch banner and pill | SALT Al Bahar Resort, or `?order=placed` on any branch |
| Being prepared | Branch banner and pill | SALT SAAD Square, or `?order=preparing` |
| Ready to collect | Branch banner and pill | SALT Riyadh Park Mall, or `?order=ready` |
| Enjoy your meal! (picked up) | Branch banner | SALT Al Ula, or `?order=done` |
| Several active orders | Swipeable cards, pill, sheet | SALT Nakheel Mall, or `?order=multi` |
| Order placed (splash) | Full screen after Place order | `U` |
| Card declined | Sheet | `U&payment=declined` |
| Not enough balance | Sheet | `U&payment=insufficient` |
| Card payments are down | Sheet | `U&payment=gateway` |
| You're offline | Sheet | `U&payment=offline` |
| Something went wrong | Sheet | `U&payment=error` |
| Still confirming your payment | Full screen | `U&payment=pending` |
| Some items just sold out | Sheet | `U&checkout=soldout` |
| That time just filled up | Sheet | `U&checkout=timefull` |
| Store paused orders | Full screen | `U&checkout=paused` |
| Paid partly / fully with INDPT balance | Checkout payment and summary | `U&balance=partial`, `U&balance=full` |
| No Apple Pay on the device | Card form inline | `U&applepay=off` |

Try again (or Check payment status) always goes through on the second attempt.

The store card shows one of four states, worked out from the real opening hours:
Open (green, Order), Opening within an hour (amber, Order ahead), Closed (grey,
Schedule) or Online ordering unavailable (grey, See menu). The branch page shows
the same badge under the name, except when the branch is open.

The For you grid at the top of every menu shows two Best sellers and two New items
the branch can sell today. Sold out items never appear there; they stay, disabled,
in their category. New items: Chicken Cheetos Slider, Classic Iced Matcha, Cheetos
Fries, Matcha Coconut Cloud.

## Scenario flags

Add these to the URL (combine with `&`). Flags on a branch page are carried
to checkout.

### Find a store

The **Location on / off** switch floating at the top of Find a store is a demo
control: it turns the simulated location on or off without the URL. With location
off there are no drive times, no "you" dot, and the list is sorted by name.

In list view, the country chips (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain) filter
the list and search results. They start on your country (Saudi Arabia with
location off).

Empty states to try:

- **No SALT near you yet** (map and list): `near=hail`, location on.
- **No SALT in this area**: drag the map somewhere with no store (the desert, the
  sea). With location on there's a Show stores near me button.
- **No stores match**: in list view, search for something like `xyz`.

| Flag | Effect | Example |
| --- | --- | --- |
| `location=prompt` | Asks for location permission | http://localhost:5173/?location=prompt |
| `location=denied` | Location off | http://localhost:5173/?location=denied |
| `location=granted` | Skips the permission step | http://localhost:5173/?location=granted |
| `near=riyadh` | You are at King Saud University, Riyadh (default) | http://localhost:5173/?near=riyadh |
| `near=khobar` | You are in Al Olaya, Al Khobar | http://localhost:5173/?near=khobar |
| `near=dubai` | You are in Downtown Dubai | http://localhost:5173/?near=dubai |
| `near=hail` | No store nearby | http://localhost:5173/?near=hail |

### Branch menu and cart

| Flag | Effect | Example |
| --- | --- | --- |
| `store=closed` | Branch closed: grey badge under the name, the View cart button becomes Schedule order | http://localhost:5173/store/salt-u-walk?store=closed |
| `store=soon` | Opens in 25 minutes: amber badge, Schedule order | http://localhost:5173/store/salt-u-walk?store=soon |
| `store=paused` | Online ordering unavailable: add buttons disabled, no cart bar | http://localhost:5173/store/salt-u-walk?store=paused |
| `order=placed` | Active order card under the name: Order placed | http://localhost:5173/store/salt-u-walk?order=placed |
| `order=preparing` | Active order: Being prepared | http://localhost:5173/store/salt-u-walk?order=preparing |
| `order=ready` | Active order: Ready to collect (green) | http://localhost:5173/store/salt-u-walk?order=ready |
| `order=done` | Active order: Enjoy your meal! | http://localhost:5173/store/salt-u-walk?order=done |
| `order=multi` | Two active orders: swipeable cards with dots | http://localhost:5173/store/salt-u-walk?order=multi |
| `menu=error` | Menu fails to load, with Try again | http://localhost:5173/store/salt-u-walk?menu=error |
| `cart=demo` | Fills the cart with the Figma items and opens it | http://localhost:5173/store/salt-u-walk?cart=demo |
| `demo=off` | Turns off the demo branches (their example orders and forced opening states) | http://localhost:5173/store/salt-saad-square?demo=off |
| `user=new` | The next first-time login gets an empty profile | http://localhost:5173/store/salt-u-walk?cart=demo&user=new |

Leaving a branch with items in the cart (back arrow) asks before clearing it.

**Active orders:** with an `order=` flag, or after you place a real order (it shows
as Order placed for a few hours), the card replaces the opening status and order
methods under the branch name. Scroll down the menu and a pill floats above the
cart bar ("Order placed #48201", or "2 active orders · 1 ready"); tap it to open the
order, or with several orders to open the Your active orders sheet. On Find a store,
a store with an active order has a green dot on its map pin (try `/?location=granted&order=ready`).

**Item sheet upsell:** at the bottom of a customisable item (e.g. Salt Burger), Goes
well with this offers extra items. Tapping + adds that item straight to the cart; the
button turns into a check and a tooltip confirms for 2 seconds.

**Cart:** the bar at the bottom of the menu shows the item count and total on the
left and a View cart button (Schedule order when the branch is closed). In the cart
sheet: the title shows the item count, there is no Edit on lines, Add order note
opens a note field (kept with the checkout), Goes well with your order adds items
with a toast, and setting a line to 0 removes it with a toast. The checkout button
shows the total; VAT is included and noted under it. Tapping Checkout as a guest
opens the login sheet, and after login you land on /checkout.

### Payment results

`payment=` sets the result of the **first** Apple Pay or card payment, after a
1 second wait. Try again (or Check payment status) then goes through. Recoverable
errors open a bottom sheet over checkout; a payment that is still pending blocks
with a full screen.

| Flag | What shows | Example |
| --- | --- | --- |
| `payment=success` | Order placed (default) | http://localhost:5173/store/salt-u-walk?cart=demo&payment=success |
| `payment=declined` | Sheet: Card declined (Try again, Use another payment method) | http://localhost:5173/store/salt-u-walk?cart=demo&payment=declined |
| `payment=insufficient` | Sheet: Not enough balance | http://localhost:5173/store/salt-u-walk?cart=demo&payment=insufficient |
| `payment=gateway` | Sheet: Card payments are down | http://localhost:5173/store/salt-u-walk?cart=demo&payment=gateway |
| `payment=offline` | Sheet: You’re offline | http://localhost:5173/store/salt-u-walk?cart=demo&payment=offline |
| `payment=error` | Sheet: Something went wrong (Try again, Get help) | http://localhost:5173/store/salt-u-walk?cart=demo&payment=error |
| `payment=pending` | Full screen: Still confirming your payment | http://localhost:5173/store/salt-u-walk?cart=demo&payment=pending |

Use another payment method closes the sheet and switches between Apple Pay and
Card.

### Checkout issues

`checkout=` sets what the store answers when you tap Place order (once).

| Flag | What shows | Example |
| --- | --- | --- |
| `checkout=soldout` | Sheet: Some items just sold out (remove and continue, or back to cart) | http://localhost:5173/store/salt-u-walk?cart=demo&checkout=soldout |
| `checkout=timefull` | Sheet: That time just filled up (switch to the next free time) | http://localhost:5173/store/salt-u-walk?cart=demo&checkout=timefull |
| `checkout=paused` | Full screen: the store paused orders (choose another store, or back to menu) | http://localhost:5173/store/salt-u-walk?cart=demo&checkout=paused |

### Payment options and balance

| Flag | Effect | Example |
| --- | --- | --- |
| (none) | Apple Pay chosen by default; Card opens the card form | http://localhost:5173/store/salt-u-walk?cart=demo |
| `applepay=off` | No Apple Pay on this device: the card form shows inline | http://localhost:5173/store/salt-u-walk?cart=demo&applepay=off |
| `balance=partial` | INDPT balance pays SAR 40, Pay the rest with Apple Pay or Card | http://localhost:5173/store/salt-u-walk?cart=demo&balance=partial |
| `balance=full` | INDPT balance pays everything: no payment options, Place order with no price | http://localhost:5173/store/salt-u-walk?cart=demo&balance=full |

## Checkout details

**Top bar:** Checkout with the branch name under it.

**Order methods:**
- Pickup: Contact, then a Pickup time dropdown.
- Carhop: Your car (a text field, prefilled with the saved car), then Pickup time.
  A new user sees an empty field; Place order without it shows "Add your car
  details so staff can find you." The car is saved after the first carhop order.
- Dine-in: When will you arrive? dropdown with the preparing note, then Contact.

A method the store doesn't offer is hidden; a paused one is shown disabled.

**Times:** when the store is open, the Pickup time dropdown shows as soon as
possible (rounded to 5 minutes) and the rest of today, every 15 minutes. When
the store is closed (schedule order, try `store=closed`), it shows tomorrow's
times only. Some slots show Fully booked.

**Cards:** Card number (brand detected as you type: mada, Visa, Mastercard),
Expiry, CVV and Name on card. Errors show when you tap Place order, for example
`4417 1234 5678 441` (Card number is incomplete) and `08/24` (Card has expired).
A good test card: `4417 1234 5678 4417`, `08/29`, `123`. Only the brand and last
4 digits go on the order. Don't enter real card details.

**Order summary:** item count with a chevron that opens the item list, the order
note from the cart, subtotal, VAT and total. With balance it adds INDPT balance
and To pay.

**Pinned bar:** Pay with Apple Pay when Apple Pay is chosen, otherwise
Place order · price.

**Next phase:** payment method and car sheets, promo codes.

## Where the data lives

| Data | Where |
| --- | --- |
| Stores, hours, order methods, menu, add-ons, availability, promos | Supabase (seeded from `supabase/seed.sql`). Falls back to `src/data/*.json` if Supabase is unreachable |
| Accounts, profile, cars, payment methods, placed orders | Supabase, each user can only read their own |
| Cart, checkout choices, chosen location | This browser only (localStorage) |

To change availability for a demo (e.g. sell out an item at a store), edit
`src/data/storeAvailability.json`, run `npm run db:seed-sql`, and run
`supabase/seed.sql` in the Supabase SQL editor.

To see what testers saved, open the Supabase dashboard: **Authentication >
Users** lists one user per tested number (`966<number>@phone.order-indpt.app`);
the `profiles`, `cars`, `payment_methods` and `orders` tables hold their data.
Deleting a user there removes all of their data.

## Not built yet

Order history (`/orders`), profile
(`/profile`) and the demo panel for switching flags without editing the URL
are placeholders for later stages.
