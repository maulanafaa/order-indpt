import { config } from './config'

const headers = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  'accept-language': 'en',
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function request(url: string, accept: string, extra: Record<string, string> = {}): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...headers, accept, ...extra },
        signal: AbortSignal.timeout(config.timeoutMs),
      })
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status} for ${url}`)
      if (res.status < 500 && res.status !== 429) break
    } catch (e) {
      lastError = e
    }
    await sleep(500 * (attempt + 1))
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function getText(url: string, extra?: Record<string, string>): Promise<string> {
  return (await request(url, 'text/html,application/xhtml+xml', extra)).text()
}

export async function getJson<T = unknown>(url: string, extra?: Record<string, string>): Promise<T> {
  const res = await request(url, 'application/json', extra)
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Not JSON from ${url} (got ${text.slice(0, 80).replace(/\s+/g, ' ')}...). The site may be showing a bot check.`)
  }
}

/** Run `fn` over `items` with limited concurrency and a small pause between starts. */
export async function pool<T, R>(items: T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
      await sleep(config.delayMs)
    }
  }
  await Promise.all(Array.from({ length: Math.min(config.concurrency, items.length) }, worker))
  return out
}
