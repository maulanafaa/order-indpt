/**
 * Corner radius and spacing, from the Foundations page.
 * Tailwind classes: rounded-2, rounded-4, rounded-6, rounded-8, rounded-12,
 * rounded-full. Spacing uses Tailwind's default 4px scale (p-1 = 4px).
 */
export const radius = {
  2: 'Tags, badges, checkbox',
  4: 'Buttons (square ones), inputs, chips, notices',
  6: 'Compact notices',
  8: 'Cards, images, toasts',
  12: 'Large cards',
  full: 'Pill buttons, icon buttons, steppers (999px in Figma)',
} as const

/** Bottom sheets have no corner radius (CLAUDE.md design rule). */
export const spacing = [4, 8, 12, 16, 24, 32] as const
