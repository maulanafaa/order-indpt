import { useEffect, useState } from 'react'

/** Seconds left until `deadline` (ms timestamp), ticking every second. 0 when null or past. */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [deadline])
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0
}
