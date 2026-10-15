import type { ReactNode } from 'react'
import { CurrencyContext, currencyFor } from '../../lib/currency'

/** Every <Price> inside uses the currency of this branch's country. Sheets opened inside follow it too. */
export function CurrencyScope({ country, children }: { country: string | undefined; children: ReactNode }) {
  return <CurrencyContext.Provider value={currencyFor(country)}>{children}</CurrencyContext.Provider>
}
