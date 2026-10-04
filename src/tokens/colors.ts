/**
 * Colour tokens, copied from the Figma "Color" variable collection
 * (file Pickup Ordering · Mobile Web, page Foundations).
 *
 * src/index.css is what the app actually renders with: every entry here is a
 * CSS variable there (`--color-<group>-<name>`) and a Tailwind utility
 * (`bg-surface-muted`, `text-text-secondary`, `border-border-default`).
 * Keep the two in sync when Figma changes. Components never use raw hex.
 */
export const colors = {
  text: {
    primary: '#111111',
    secondary: '#636363',
    tertiary: '#767676',
    disabled: '#b3b3b3',
    'on-inverse': '#ffffff',
    'on-inverse-muted': '#b8b8b8',
  },
  surface: {
    base: '#ffffff',
    muted: '#f4f4f4',
    inverse: '#111111',
    disabled: '#ebebeb',
  },
  border: {
    default: '#e3e3e3',
    strong: '#111111',
  },
  state: {
    error: '#b3261e',
    'error-subtle': '#fbeae9',
    success: '#1b6e3f',
    'success-subtle': '#e4f3ea',
    warning: '#8a5300',
    'warning-subtle': '#fff4d6',
  },
  accent: {
    promo: '#c43e14',
    'promo-subtle': '#fce8e0',
  },
} as const

/** Where each token is used, from the Foundations page notes. */
export const colorUsage: Record<string, string> = {
  'text/primary': 'Headings, body, prices',
  'text/secondary': 'Descriptions, labels',
  'text/tertiary': 'Captions, meta, placeholders',
  'text/disabled': 'Disabled controls only',
  'text/on-inverse': 'Text on black surfaces',
  'text/on-inverse-muted': 'Secondary text on black',
  'surface/base': 'Page background',
  'surface/muted': 'Grouped blocks, tertiary buttons',
  'surface/inverse': 'Primary buttons, selected states',
  'surface/disabled': 'Disabled buttons',
  'border/default': 'Cards, inputs, dividers',
  'border/strong': 'Focused input, secondary button, selected card',
  'state/error': 'Errors only',
  'state/error-subtle': 'Error banner background',
  'state/success': 'Success, selected chip',
  'state/success-subtle': 'Success banner background',
  'state/warning': 'Warnings',
  'state/warning-subtle': 'Warning banner background',
  'accent/promo': 'Promos, offers, cart count',
  'accent/promo-subtle': 'Promo background',
}

export type ColorGroup = keyof typeof colors
