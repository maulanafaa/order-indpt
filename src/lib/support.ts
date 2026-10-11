/** Customer service number (SALT unified number, KSA). */
export const SUPPORT_PHONE = '920024788'

/** Opens the phone's native call prompt for customer service. */
export function callSupport() {
  window.location.href = `tel:${SUPPORT_PHONE}`
}
