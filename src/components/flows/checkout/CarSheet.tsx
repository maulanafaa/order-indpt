import { useId, useState } from 'react'
import type { Car, User } from '../../../data/schema'
import { useAuth } from '../../../lib/auth'
import { carTitle } from '../../../lib/checkout'
import { cn } from '../../../lib/cn'
import { fakeRequest } from '../../../lib/fake'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { CheckboxRow } from '../../ui/CheckboxRow'
import { RadioMark } from '../../ui/Controls'
import { Icon } from '../../ui/Icon'
import { Input } from '../../ui/Input'
import { SheetHeader } from '../../ui/SheetHeader'

type CarSheetProps = {
  open: boolean
  onClose: () => void
  user: User
  value: string | null
  /** A car added without "Save this car for next time" is passed as `oneOff`. */
  onChoose: (carId: string, oneOff?: Car | null) => void
}

/**
 * Figma car sheets: choose from the list (Use this car, Edit selected car),
 * add a car, edit a car (Save changes, Remove car), and a new user's first car.
 */
export function CarSheet(props: CarSheetProps) {
  return (
    <BottomSheet open={props.open} onClose={props.onClose} bare ariaLabel="Your car">
      {props.open && <CarBody {...props} />}
    </BottomSheet>
  )
}

type View = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; car: Car }

function CarBody({ onClose, user, value, onChoose }: CarSheetProps) {
  const updateUser = useAuth((s) => s.updateUser)
  const cars = user.cars
  const [view, setView] = useState<View>(cars.length ? { kind: 'list' } : { kind: 'add' })
  const [picked, setPicked] = useState<string | null>(value ?? cars.find((c) => c.isDefault)?.id ?? cars[0]?.id ?? null)
  const titleId = useId()
  const firstCar = cars.length === 0

  if (view.kind === 'add' || view.kind === 'edit') {
    const editing = view.kind === 'edit' ? view.car : null
    return (
      <CarForm
        title={editing ? 'Edit car' : firstCar ? 'Add your car' : 'Add a car'}
        subtitle={firstCar ? 'We’ll save it so next time is one tap.' : undefined}
        initial={editing}
        showSave={!editing && !firstCar}
        onBack={firstCar ? undefined : () => setView({ kind: 'list' })}
        onClose={onClose}
        onSave={(car, keep) => {
          if (editing) {
            updateUser((u) => ({ cars: u.cars.map((c) => (c.id === editing.id ? { ...c, ...car } : c)) }))
            setView({ kind: 'list' })
            return
          }
          if (!keep) {
            // Not saved to the profile: used for this order only.
            onChoose('car-once', { id: 'car-once', ...car, isDefault: false })
            onClose()
            return
          }
          const id = `car-${Date.now().toString(36)}`
          updateUser((u) => ({ cars: [...u.cars, { id, ...car, isDefault: u.cars.length === 0 }] }))
          onChoose(id, null)
          onClose()
        }}
        onRemove={
          editing
            ? () => {
                updateUser((u) => ({ cars: u.cars.filter((c) => c.id !== editing.id) }))
                if (picked === editing.id) setPicked(null)
                setView(cars.length > 1 ? { kind: 'list' } : { kind: 'add' })
              }
            : undefined
        }
      />
    )
  }

  const selected = cars.find((c) => c.id === picked) ?? null
  return (
    <div className="flex min-h-0 flex-col">
      <SheetHeader title="Your car" titleId={titleId} onClose={onClose} />
      <p className="px-4 pt-1 body-s text-text-secondary">Staff use this to find you in the carhop bays.</p>
      <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto px-4 pt-4" role="radiogroup" aria-labelledby={titleId}>
        {cars.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={picked === c.id}
            onClick={() => setPicked(c.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-8 bg-surface-base p-3 text-start',
              picked === c.id ? 'inset-ring-[1.5px] inset-ring-border-strong' : 'inset-ring inset-ring-border-default',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
              <Icon name="car" size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate label-l text-text-primary">{carTitle(c)}</span>
              <span className="body-s text-text-secondary">Plate {c.plate}</span>
            </span>
            <RadioMark checked={picked === c.id} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setView({ kind: 'add' })}
          className="flex w-full items-center gap-3 rounded-8 bg-surface-base p-3 text-start inset-ring inset-ring-border-default active:bg-surface-muted"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
            <Icon name="plus" size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="label-l text-text-primary">Add a car</span>
            <span className="body-s text-text-secondary">Make, colour and plate</span>
          </span>
          <Icon name="chev" size={20} />
        </button>
      </div>
      <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <Button
          fullWidth
          disabled={!selected}
          onClick={() => {
            if (!selected) return
            onChoose(selected.id)
            onClose()
          }}
        >
          Use this car
        </Button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && setView({ kind: 'edit', car: selected })}
          className="py-1 cta-m text-text-primary underline disabled:text-text-disabled"
        >
          Edit selected car
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

type CarFields = Pick<Car, 'make' | 'model' | 'colour' | 'plate'>

function CarForm({
  title,
  subtitle,
  initial,
  showSave,
  onBack,
  onClose,
  onSave,
  onRemove,
}: {
  title: string
  subtitle?: string
  initial: Car | null
  showSave: boolean
  onBack?: () => void
  onClose: () => void
  onSave: (car: CarFields, keep: boolean) => void
  onRemove?: () => void
}) {
  const titleId = useId()
  const [makeModel, setMakeModel] = useState(initial ? `${initial.make} ${initial.model}`.trim() : '')
  const [colour, setColour] = useState(initial?.colour ?? '')
  const [plate, setPlate] = useState(initial?.plate ?? '')
  const [keep, setKeep] = useState(true)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const errors = {
    makeModel: makeModel.trim() ? undefined : 'Enter the make and model.',
    colour: colour.trim() ? undefined : 'Enter a colour.',
    plate: plate.trim().length >= 3 ? undefined : 'Enter the plate number.',
  }

  const submit = async () => {
    setTried(true)
    if (Object.values(errors).some(Boolean)) return
    setSaving(true)
    await fakeRequest()
    setSaving(false)
    const [make, ...rest] = makeModel.trim().split(/\s+/)
    onSave({ make, model: rest.join(' '), colour: colour.trim(), plate: plate.trim().toUpperCase() }, keep)
  }

  return (
    <div className="flex min-h-0 flex-col">
      <SheetHeader title={title} titleId={titleId} onClose={onClose} onBack={onBack} />
      {subtitle && <p className="px-4 pt-1 body-s text-text-secondary">{subtitle}</p>}
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="flex flex-col gap-4 px-4 pt-5">
          <Input label="Make and model" value={makeModel} onChange={setMakeModel} placeholder="e.g. Hyundai Sonata" error={tried ? errors.makeModel : undefined} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Colour" value={colour} onChange={setColour} placeholder="e.g. Silver" error={tried ? errors.colour : undefined} />
            <Input
              label="Plate number"
              value={plate}
              onChange={(v) => setPlate(v.toUpperCase().slice(0, 10))}
              placeholder="e.g. ABC 1234"
              autoCapitalize="characters"
              error={tried ? errors.plate : undefined}
            />
          </div>
          {showSave && <CheckboxRow checked={keep} onChange={setKeep} label="Save this car for next time" />}
        </div>
        <div className="flex flex-col gap-3 px-4 pt-5 pb-[max(24px,env(safe-area-inset-bottom))]">
          <Button type="submit" fullWidth loading={saving}>
            {initial ? 'Save changes' : 'Save car'}
          </Button>
          {onRemove && (
            <Button
              fullWidth
              variant="ghost"
              loading={removing}
              onClick={async () => {
                setRemoving(true)
                await fakeRequest()
                setRemoving(false)
                onRemove()
              }}
            >
              Remove car
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
