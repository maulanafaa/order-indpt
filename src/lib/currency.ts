/**
 * Prices show the currency of the branch's country (Figma "Currency": SAR, AED,
 * QAR, KWD, BHD). Pages for one branch wrap their content in <CurrencyScope>,
 * and <Price> reads it from here. Amounts are not converted in the prototype.
 */
import { createContext, useContext } from 'react'

export type CurrencyCode = 'SAR' | 'AED' | 'QAR' | 'KWD' | 'BHD'

const byCountry: Record<string, CurrencyCode> = {
  'Saudi Arabia': 'SAR',
  'United Arab Emirates': 'AED',
  Qatar: 'QAR',
  Kuwait: 'KWD',
  Bahrain: 'BHD',
}

export const currencyFor = (country: string | undefined): CurrencyCode => (country ? (byCountry[country] ?? 'SAR') : 'SAR')

export const CurrencyContext = createContext<CurrencyCode>('SAR')

export const useCurrency = () => useContext(CurrencyContext)
