import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { Item } from '../../data/schema'
import { itemBySlug } from '../../lib/data'

/** Opens and closes the item sheet through ?item=slug, so links and Back work. */
export function useItemParam() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const slug = params.get('item')
  const item = slug ? (itemBySlug.get(slug) ?? null) : null
  // Keep the last item so the sheet can animate out after ?item= is removed.
  const [lastItem, setLastItem] = useState<Item | null>(item)
  if (item && item !== lastItem) setLastItem(item)

  const openItem = useCallback(
    (it: Item) =>
      setParams(
        (p) => {
          p.set('item', it.slug)
          return p
        },
        { state: { itemSheet: true } },
      ),
    [setParams],
  )
  const closeItem = useCallback(() => {
    if ((location.state as { itemSheet?: boolean } | null)?.itemSheet) navigate(-1)
    else
      setParams(
        (p) => {
          p.delete('item')
          return p
        },
        { replace: true },
      )
  }, [location.state, navigate, setParams])

  return { item, lastItem, openItem, closeItem }
}
