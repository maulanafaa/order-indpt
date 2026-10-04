import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Notice } from '../ui/Notice'
import { TopBar } from '../ui/TopBar'

type PlaceholderPageProps = {
  title: string
  leading?: 'back' | 'close' | 'none'
  /** Which build stage fills this page in. */
  stage: string
  children?: ReactNode
}

/** Temporary page used until the stage that builds the real screen. */
export function PlaceholderPage({ title, leading = 'back', stage, children }: PlaceholderPageProps) {
  return (
    <>
      <TopBar title={title} leading={leading} />
      <main className="flex flex-col gap-6 px-4 pt-6 pb-10">
        <Notice tone="neutral" title="Placeholder">
          This screen is built in {stage}.
        </Notice>
        {children}
        <PrototypeNav />
      </main>
    </>
  )
}

const links = [
  { to: '/', label: 'Find a store' },
  { to: '/store/salt-u-walk', label: 'Store: SALT U Walk' },
  { to: '/checkout', label: 'Checkout' },
  { to: '/order/SLT-24091', label: 'Order SLT-24091' },
  { to: '/orders', label: 'Orders' },
  { to: '/profile', label: 'Profile' },
  { to: '/help', label: 'Help centre' },
  { to: '/components', label: 'Components' },
]

export function PrototypeNav() {
  return (
    <nav aria-label="Prototype pages" className="flex flex-col">
      <p className="overline-text pb-2 text-text-tertiary">Prototype pages</p>
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="flex h-12 items-center justify-between border-b border-border-default body-m text-text-primary"
        >
          {l.label}
          <span className="caption text-text-tertiary">{l.to}</span>
        </Link>
      ))}
    </nav>
  )
}
