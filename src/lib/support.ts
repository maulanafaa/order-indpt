/** Customer service number (SALT unified number, KSA). */
export const SUPPORT_PHONE = '920024788'

/** Opens the phone's native call prompt for customer service. */
export function callSupport() {
  window.location.href = `tel:${SUPPORT_PHONE}`
}

/** Opens the phone's native call prompt for a number (e.g. the branch). */
export function callNumber(phone: string) {
  window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`
}
