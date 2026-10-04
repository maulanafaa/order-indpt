/**
 * Scenario flags that force edge cases. For now they are read from the URL
 * (e.g. /store/salt-u-walk?menu=error); Stage 6 adds the demo panel.
 *
 *   menu=error              branch menu fails to load
 *   store=closed            force the branch closed (Schedule order)
 *   location=prompt|denied|granted   location permission
 *   near=riyadh|khobar|dubai|hail    where "you" are (hail = no store nearby)
 *   user=new                logging in gives a user with nothing saved
 *   cart=demo               on a branch page, fills the cart with the Figma items,
 *                           including a sold out item and a removed add-on
 *   payment=success|declined|insufficient|gateway|pending
 *                           result of paying by card or Apple Pay (cash always goes through)
 *   checkout=soldout|paused|timefull|promo
 *                           what the store says when you tap Place order
 */
import { useSearchParams } from 'react-router'
import type { LatLng } from './geo'

export type NearPreset = { key: string; label: string; point: LatLng }

export const nearPresets: Record<string, NearPreset> = {
  riyadh: { key: 'riyadh', label: 'King Saud University, Riyadh', point: { lat: 24.7255, lng: 46.627 } },
  khobar: { key: 'khobar', label: 'Al Olaya, Al Khobar', point: { lat: 26.2994, lng: 50.1834 } },
  dubai: { key: 'dubai', label: 'Downtown, Dubai', point: { lat: 25.1972, lng: 55.2744 } },
  hail: { key: 'hail', label: "Near Ha'il, Ha'il Region", point: { lat: 27.5114, lng: 41.7208 } },
}

export type LocationFlag = 'prompt' | 'granted' | 'denied'

export const paymentResults = ['success', 'declined', 'insufficient', 'gateway', 'pending'] as const
export type PaymentResult = (typeof paymentResults)[number]
export const checkoutIssues = ['soldout', 'paused', 'timefull', 'promo'] as const
export type CheckoutIssue = (typeof checkoutIssues)[number]

function pick<T extends string, F extends T | null>(value: string | null, allowed: readonly T[], fallback: F): T | F {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function useScenario() {
  const [params] = useSearchParams()
  const near = nearPresets[params.get('near') ?? ''] ?? nearPresets.riyadh
  const loc = params.get('location')
  return {
    menuError: params.get('menu') === 'error',
    storeClosed: params.get('store') === 'closed',
    location: (loc === 'prompt' || loc === 'granted' || loc === 'denied' ? loc : null) as LocationFlag | null,
    near,
    newUser: params.get('user') === 'new',
    cartDemo: params.get('cart') === 'demo',
    payment: pick(params.get('payment'), paymentResults, 'success'),
    checkoutIssue: pick(params.get('checkout'), checkoutIssues, null),
  }
}
