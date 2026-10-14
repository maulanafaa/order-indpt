import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { Item, Store } from '../../data/schema'
import { cartCount, useCart, type CartLine } from '../../lib/cart'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { CartSheet } from './CartSheet'

type NewLine = Omit<CartLine, 'id'>

/** Figma cart for scenario cart=demo at SALT U Walk: one sold out item, two removed add-ons. */
const DEMO_LINES: NewLine[] = [
  {
    itemId: 'item-20000001', // Salt Burger
    quantity: 1,
    note: '',
    modifiers: [
      { modifierId: 'mod-20000001-remove-no-onion-white-fresh', quantity: 1 },
      { modifierId: 'mod-20000001-add-extra-extra-jalapeno-sliced', quantity: 1 },
      { modifierId: 'mod-20000001-add-fries-fire-fries', quantity: 1 },
    ],
  },
  { itemId: 'item-20001060', quantity: 1, note: '', modifiers: [] }, // Iced Latte
  {
    itemId: 'item-20000003', // Original Beef Slider
    quantity: 1,
    note: '',
    modifiers: [
      { modifierId: 'mod-20000003-remove-no-pickle', quantity: 1 },
      { modifierId: 'mod-20000003-add-extra-extra-jalapeno-sliced', quantity: 1 },
    ],
  },
  { itemId: 'item-20000039', quantity: 2, note: '', modifiers: [] }, // Lotus Softie
  { itemId: 'item-20000002', quantity: 1, note: '', modifiers: [] }, // Campfire Burger (sold out at U Walk)
]

type Options = {
  store: Store
  closed: boolean
  soldOutItems: Set<string>
  unavailableModifiers: Set<string>
  closeItem: () => void
  /** Go to checkout from the cart sheet. Default: open /checkout (logging in first if needed). */
  onCheckout?: () => void
}

/**
 * Cart sheet, login and "Leave store" for a branch page.
 * Checkout: signed in goes straight to /checkout; a guest logs in first.
 */
export function useCartFlow({ store, closed, soldOutItems, unavailableModifiers, closeItem, onCheckout }: Options) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const cartStore = useCart((s) => s.storeSlug)
  const allLines = useCart((s) => s.lines)
  const updateLine = useCart((s) => s.updateLine)
  const addLine = useCart((s) => s.addLine)
  const replace = useCart((s) => s.replace)
  const lines = cartStore === store.slug ? allLines : []
  const count = cartCount(lines)

  const [cartOpen, setCartOpen] = useState(
    () => Boolean((location.state as { openCart?: boolean } | null)?.openCart) || params.get('cart') === 'demo',
  )
  const [leaveOpen, setLeaveOpen] = useState(false)
  /** The item sheet was opened from the cart (Edit or upsell): go back to the cart after. */
  const [returnToCart, setReturnToCart] = useState(false)
  const [editing, setEditing] = useState<{ lineId: string; line: NewLine } | null>(null)

  // cart=demo: fill the cart with the Figma items and open it.
  useEffect(() => {
    if (!params.has('cart')) return
    if (params.get('cart') === 'demo') replace(store.slug, DEMO_LINES)
    setParams(
      (p) => {
        p.delete('cart')
        return p
      },
      { replace: true },
    )
  }, [params, replace, setParams, store.slug])

  const closeCart = useCallback(() => setCartOpen(false), [])

  /** "+" on a cart upsell card: added straight away (upsell items need no choices). */
  const upsell = (item: Item) => {
    addLine(store.slug, { itemId: item.id, quantity: 1, modifiers: [], note: '' })
  }

  /** Keep demo flags (payment=..., checkout=...) on the way to checkout. */
  const checkoutUrl = () => {
    const keep = new URLSearchParams()
    for (const k of ['payment', 'checkout', 'applepay', 'balance', 'user']) {
      const v = params.get(k)
      if (v) keep.set(k, v)
    }
    const q = keep.toString()
    return q ? `/checkout?${q}` : '/checkout'
  }

  const checkout = () => {
    setCartOpen(false)
    // Signed in or not: the number is verified on the checkout page.
    if (onCheckout) onCheckout()
    else navigate(checkoutUrl())
  }

  /** Back to Find a store. With items in the cart, ask first. */
  const goBack = () => (count > 0 ? setLeaveOpen(true) : navigate('/'))

  /** Item sheet close: back to the cart when it came from there. */
  const onItemClose = () => {
    closeItem()
    setEditing(null)
    if (returnToCart) {
      setReturnToCart(false)
      setCartOpen(true)
    }
  }

  /** Item sheet submit while editing: replace the line instead of adding. */
  const onItemSave = (line: NewLine, done: () => void, add: (line: NewLine, done: () => void) => void) => {
    if (editing) {
      updateLine(editing.lineId, line)
      done()
    } else add(line, done)
  }

  const sheets = (
    <>
      <CartSheet
        store={store}
        open={cartOpen}
        onClose={closeCart}
        soldOutItems={soldOutItems}
        unavailableModifiers={unavailableModifiers}
        onUpsell={upsell}
        onCheckout={checkout}
        closed={closed}
        checkoutLabel={onCheckout ? 'Back to checkout' : undefined}
      />
      <BottomSheet open={leaveOpen} onClose={() => setLeaveOpen(false)} ariaLabel={`Leave ${store.name}?`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="title-l pe-10">Leave {store.name}?</h2>
            <p className="body-m text-text-secondary">
              You have {count} {count === 1 ? 'item' : 'items'} in your cart. Your cart is for this store only, so leaving clears it.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button fullWidth onClick={() => setLeaveOpen(false)}>
              Keep my cart
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => {
                useCart.getState().clear()
                setLeaveOpen(false)
                navigate('/')
              }}
            >
              Clear cart and leave
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  )

  return { sheets, openCart: () => setCartOpen(true), goBack, editing, onItemClose, onItemSave }
}
