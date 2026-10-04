/** Every "network call" in the prototype waits this long so loading states show. */
export const FAKE_DELAY_MS = 1000

export const fakeRequest = (ms = FAKE_DELAY_MS) => new Promise<void>((r) => window.setTimeout(r, ms))
