import { useEffect, useState } from 'react'

/** Current time, refreshed every minute so open and closed labels stay right. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}
