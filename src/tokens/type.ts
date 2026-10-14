/**
 * Text styles, copied from the Figma local text styles.
 * Each one is a utility class in src/index.css with the same name in kebab
 * case: `Title/XL` -> `title-xl`, `Price/M` -> `price-m`.
 */
export type TextStyle = {
  figma: string
  className: string
  family: 'Barlow Semi Condensed' | 'Figtree'
  weight: 400 | 500 | 600
  size: number
  lineHeight: number
  letterSpacing?: string
  upper?: boolean
  usage: string
  sample: string
}

export const textStyles: TextStyle[] = [
  { figma: 'Display', className: 'display', family: 'Barlow Semi Condensed', weight: 600, size: 40, lineHeight: 46, usage: 'Order number and success moments', sample: '#SLT-24091' },
  { figma: 'Title/XL', className: 'title-xl', family: 'Barlow Semi Condensed', weight: 600, size: 30, lineHeight: 36, usage: 'Page hero titles', sample: 'Order ahead, skip the line' },
  { figma: 'Title/L', className: 'title-l', family: 'Barlow Semi Condensed', weight: 600, size: 24, lineHeight: 30, usage: 'Screen titles', sample: 'Choose a store' },
  { figma: 'Title/M', className: 'title-m', family: 'Barlow Semi Condensed', weight: 600, size: 20, lineHeight: 26, usage: 'Sheet titles, empty states, item detail name', sample: 'Salt Burger' },
  { figma: 'Title/S', className: 'title-s', family: 'Barlow Semi Condensed', weight: 600, size: 17, lineHeight: 22, usage: 'Top bar titles, section and card titles', sample: 'Payment details' },
  { figma: 'CTA/L', className: 'cta-l', family: 'Barlow Semi Condensed', weight: 500, size: 17, lineHeight: 20, usage: 'Primary and secondary buttons, 52px tall', sample: 'Place order' },
  { figma: 'CTA/M', className: 'cta-m', family: 'Barlow Semi Condensed', weight: 500, size: 15, lineHeight: 18, usage: 'Compact buttons (44px) and text links', sample: 'Get directions' },
  { figma: 'Body/L', className: 'body-l', family: 'Figtree', weight: 400, size: 16, lineHeight: 24, usage: 'Intro paragraphs', sample: 'Allow location access so we can show the closest store.' },
  { figma: 'Body/M', className: 'body-m', family: 'Figtree', weight: 400, size: 14, lineHeight: 20, usage: 'Default body copy', sample: 'Double beef patty, cheese, onions and secret sauce.' },
  { figma: 'Body/S', className: 'body-s', family: 'Figtree', weight: 400, size: 13, lineHeight: 18, usage: 'Descriptions, helper and error text', sample: 'Pick up at the counter inside U Walk.' },
  { figma: 'Label/L', className: 'label-l', family: 'Figtree', weight: 600, size: 15, lineHeight: 20, usage: 'Menu item names, selected values', sample: 'Original Beef Slider' },
  { figma: 'Label/M', className: 'label-m', family: 'Figtree', weight: 500, size: 14, lineHeight: 20, usage: 'Form labels, options, chips', sample: 'Extra jalapeño' },
  { figma: 'Label/S', className: 'label-s', family: 'Figtree', weight: 600, size: 12, lineHeight: 16, letterSpacing: '0.01em', usage: 'Tags and badges', sample: 'Best seller' },
  { figma: 'Caption', className: 'caption', family: 'Figtree', weight: 400, size: 12, lineHeight: 16, usage: 'Timestamps and meta', sample: 'Sat, 26 Sep · 9:14 AM' },
  { figma: 'Overline', className: 'overline-text', family: 'Figtree', weight: 600, size: 11, lineHeight: 14, letterSpacing: '0.08em', upper: true, usage: 'Group labels', sample: 'Payment method' },
  { figma: 'Input', className: 'input-text', family: 'Figtree', weight: 400, size: 16, lineHeight: 24, usage: 'Input values. 16px stops iOS Safari from zooming', sample: '55 123 4567' },
  { figma: 'Price/L', className: 'price-l', family: 'Figtree', weight: 600, size: 16, lineHeight: 20, usage: 'Totals', sample: '132.30' },
  { figma: 'Price/M', className: 'price-m', family: 'Figtree', weight: 600, size: 14, lineHeight: 20, usage: 'Item prices', sample: '24.00' },
  { figma: 'Product/L', className: 'product-l', family: 'Barlow Semi Condensed', weight: 600, size: 18, lineHeight: 22, usage: 'Food and drink names, large', sample: 'Spanish Latte' },
  { figma: 'Product/M', className: 'product-m', family: 'Barlow Semi Condensed', weight: 500, size: 16, lineHeight: 20, usage: 'Food and drink names, compact', sample: 'Lotus Softie' },
]
