import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ServiceChips } from '../components/flows/ServiceChips'
import { StaticMap } from '../components/flows/StaticMap'
import { Button, Icon, IconButton, Tabs, TopBar, useToast, type IconName } from '../components/ui'
import { cn } from '../lib/cn'
import { storeBySlug } from '../lib/data'
import { directionsUrl, distanceKm, formatDistance } from '../lib/geo'
import { weekHours } from '../lib/hours'
import { useLocationStore } from '../lib/location'
import { useScenario } from '../lib/scenarios'

/** Figma "Store info · Details" and "Store info · Opening hours". */
export default function StoreInfoPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const store = storeBySlug.get(slug)
  const [tab, setTab] = useState<'details' | 'hours'>('details')
  const located = useLocationStore((s) => s.permission === 'granted')
  const { near } = useScenario()

  if (!store) return <Navigate to="/" replace />

  const point = { lat: store.lat, lng: store.lng }
  const km = located ? distanceKm(near.point, point) : null
  const phone = store.phone
  const phoneDisplay = phone.length === 9 && phone.startsWith('9200') ? `${phone.slice(0, 4)} ${phone.slice(4)}` : phone

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.show({ type: 'success', message })
    } catch {
      toast.show({ type: 'error', message: 'Couldn’t copy. Try again.' })
    }
  }

  return (
    <div className="min-h-full bg-surface-base">
      <TopBar title="Store info" onLeading={() => navigate(`/store/${store.slug}`)} />
      <header className="flex flex-col gap-3 px-4 pt-4 pb-4">
        <h1 className="title-xl">{store.name}</h1>
        <ServiceChips storeId={store.id} />
      </header>
      <Tabs
        fill
        label="Store info"
        value={tab}
        onChange={(v) => setTab(v as 'details' | 'hours')}
        items={[
          { id: 'details', label: 'Details' },
          { id: 'hours', label: 'Opening hours' },
        ]}
      />

      {tab === 'details' ? (
        <div className="flex flex-col gap-5 px-4 pt-4 pb-10">
          <StaticMap
            center={point}
            zoom={14}
            pins={[{ id: store.id, point, label: store.name }]}
            selectedId={store.id}
            user={located ? near.point : null}
            className="h-40 rounded-8 inset-ring inset-ring-border-default"
          />
          <div className="flex gap-3">
            <Icon name="pin" size={20} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="body-m text-text-primary">{store.address || store.country}</p>
              {km != null && <p className="caption text-text-tertiary">{formatDistance(km)} away</p>}
            </div>
          </div>
          <Button variant="secondary" fullWidth leadingIcon="nav" onClick={() => window.open(directionsUrl(point), '_blank', 'noopener')}>
            Get directions
          </Button>

          {(phone || store.email) && (
            <section className="flex flex-col gap-3 pt-2">
              <h2 className="title-s">Contact</h2>
              <div className="rounded-8 inset-ring inset-ring-border-default">
                {phone && (
                  <ContactRow
                    icon="phone"
                    caption="Call · tap to dial"
                    value={phoneDisplay}
                    href={`tel:${phone}`}
                    onCopy={() => copy(phone, 'Number copied')}
                    copyLabel="Copy number"
                  />
                )}
                {store.email && (
                  <ContactRow
                    icon="mail"
                    caption="Email · tap to write"
                    value={store.email}
                    href={`mailto:${store.email}`}
                    onCopy={() => copy(store.email!, 'Email copied')}
                    copyLabel="Copy email"
                    divider={Boolean(phone)}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      ) : (
        <ul className="px-4 pt-2 pb-10">
          {weekHours(store).map((d) => (
            <li
              key={d.day}
              className={cn(
                'flex justify-between border-b border-border-default py-3',
                d.isToday ? 'label-m text-text-primary' : 'body-m text-text-secondary',
              )}
            >
              <span>
                {d.name}
                {d.isToday && ' (today)'}
              </span>
              <span>{d.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ContactRow({
  icon,
  caption,
  value,
  href,
  onCopy,
  copyLabel,
  divider,
}: {
  icon: IconName
  caption: string
  value: string
  href: string
  onCopy: () => void
  copyLabel: string
  divider?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', divider && 'border-t border-border-default')}>
      <Icon name={icon} size={20} className="shrink-0" />
      <a href={href} className="flex min-w-0 flex-1 flex-col">
        <span className="caption text-text-tertiary">{caption}</span>
        <span className="truncate body-m text-text-primary">{value}</span>
      </a>
      <IconButton icon="copy" label={copyLabel} variant="outline" size={32} onClick={onCopy} />
    </div>
  )
}
