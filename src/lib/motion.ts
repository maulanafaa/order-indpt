/** Store card selection motion: how long the map and the card row take to glide. */
export const CARD_GLIDE_MS = 420

/** Ease in out sine, the JS twin of --ease-card: cubic-bezier(0.37, 0, 0.63, 1). Gentle start and stop. */
export function easeCard(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2
}
