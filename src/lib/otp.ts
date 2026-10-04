/**
 * Fake OTP service for the prototype. No network: small delays and fixed rules.
 *
 * Phone step
 *   50 000 0000   the code can't be sent (connection problem)
 *   59 999 9999   too many code requests (wait 10 minutes)
 *   any other valid number gets a code
 *
 * Code step
 *   000000   incorrect (3 tries, then code entry pauses for 15 minutes)
 *   111111   expired
 *   any other 6 digits pass
 */
export const RESEND_SECONDS = 45
export const MAX_ATTEMPTS = 3
export const REQUEST_LOCK_SECONDS = 10 * 60
export const ATTEMPT_LOCK_SECONDS = 15 * 60

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

export type SendResult = 'sent' | 'failed' | 'rateLimited'
export type VerifyResult = 'ok' | 'incorrect' | 'expired'

export async function sendCode(mobile: string): Promise<SendResult> {
  await wait(900)
  if (mobile === '500000000') return 'failed'
  if (mobile === '599999999') return 'rateLimited'
  return 'sent'
}

export async function verifyCode(code: string): Promise<VerifyResult> {
  await wait(800)
  if (code === '000000') return 'incorrect'
  if (code === '111111') return 'expired'
  return 'ok'
}

/** 125 → "2:05", 598 → "09:58" when padMinutes. */
export function formatCountdown(seconds: number, padMinutes = false) {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  return `${padMinutes ? String(m).padStart(2, '0') : m}:${String(s % 60).padStart(2, '0')}`
}
