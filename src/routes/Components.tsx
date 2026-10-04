import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  Badge,
  BottomSheet,
  Button,
  CheckboxMark,
  Chip,
  Icon,
  IconButton,
  Input,
  Notice,
  OptionRow,
  Price,
  QuantityStepper,
  RadioMark,
  SarIcon,
  Select,
  Tabs,
  Textarea,
  Toast,
  TopBar,
  useToast,
  type BadgeVariant,
  type ButtonVariant,
  type IconButtonStyle,
  type NoticeTone,
  type PriceSize,
  type PriceTone,
  type SelectOption,
} from '../components/ui'
import { iconNames } from '../icons'
import { colors, colorUsage, textStyles } from '../tokens'

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const sections = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'actions', label: 'Actions' },
  { id: 'labels', label: 'Labels' },
  { id: 'forms', label: 'Forms' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'sheets', label: 'Sheets' },
]

/** Every UI component and state, for review against the Figma Components page. */
export default function ComponentsPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState(sections[0].id)

  // Highlight the section in view.
  useEffect(() => {
    const root = document.querySelector('[data-scroll-root]')
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e))
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id)
      },
      { root, rootMargin: '-100px 0px -70% 0px' },
    )
    els.forEach((e) => io.observe(e))
    // The last section is short, so mark it active once the page hits the bottom.
    const onScroll = () => {
      if (root && root.scrollTop + root.clientHeight >= root.scrollHeight - 4) setActive(sections[sections.length - 1].id)
    }
    root?.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      root?.removeEventListener('scroll', onScroll)
    }
  }, [])

  const jump = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <TopBar title="Components" leading="back" onLeading={() => navigate('/')} />
      <div className="sticky top-14 z-10">
        <Tabs items={sections} value={active} onChange={jump} label="Component groups" />
      </div>
      <main>
        <Group id="foundations" title="Foundations">
          <ColorsBlock />
          <TypeBlock />
          <RadiusBlock />
          <IconsBlock />
        </Group>
        <Group id="actions" title="Actions">
          <ButtonBlock />
          <IconButtonBlock />
          <StepperBlock />
        </Group>
        <Group id="labels" title="Labels and prices">
          <PriceBlock />
          <BadgeBlock />
          <ChipBlock />
        </Group>
        <Group id="forms" title="Forms">
          <InputBlock />
          <TextareaBlock />
          <SelectBlock />
          <OptionRowBlock />
        </Group>
        <Group id="feedback" title="Feedback">
          <NoticeBlock />
          <ToastBlock />
        </Group>
        <Group id="navigation" title="Navigation">
          <TopBarBlock />
          <TabsBlock />
        </Group>
        <Group id="sheets" title="Sheets">
          <SheetBlock />
        </Group>
      </main>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[100px] border-b-8 border-surface-muted">
      <h2 className="overline-text px-4 pt-6 text-text-tertiary">{title}</h2>
      {children}
    </section>
  )
}

function Block({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border-default px-4 pt-4 pb-6 last:border-b-0">
      <div className="flex flex-col gap-1">
        <h3 className="title-l">{title}</h3>
        {desc && <p className="body-s text-text-secondary">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Row({ label, children, wrap = true }: { label?: string; children: ReactNode; wrap?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <p className="caption text-text-tertiary">{label}</p>}
      <div className={wrap ? 'flex flex-wrap items-center gap-3' : 'flex flex-col gap-3'}>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Foundations                                                         */
/* ------------------------------------------------------------------ */

function ColorsBlock() {
  return (
    <Block title="Color" desc="Black and white, with one red used only for errors.">
      {Object.entries(colors).map(([group, values]) => (
        <Row key={group} label={group} wrap={false}>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(values).map(([name, hex]) => {
              const token = `${group}/${name}`
              return (
                <div key={name} className="flex flex-col gap-1">
                  <div
                    className="h-12 rounded-4 inset-ring inset-ring-border-default"
                    style={{ backgroundColor: `var(--color-${group}-${name})` }}
                  />
                  <p className="label-s">{token}</p>
                  <p className="caption text-text-tertiary">
                    {hex.toUpperCase()} · {colorUsage[token]}
                  </p>
                </div>
              )
            })}
          </div>
        </Row>
      ))}
    </Block>
  )
}

function TypeBlock() {
  return (
    <Block title="Typography" desc="Barlow Semi Condensed for titles and buttons. Figtree for everything people read in detail.">
      <div className="flex flex-col">
        {textStyles.map((t) => (
          <div key={t.className} className="flex flex-col gap-1 border-b border-border-default py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="label-s">{t.figma}</span>
              <code className="caption text-text-tertiary">.{t.className}</code>
            </div>
            <p className="caption text-text-tertiary">
              {t.family} {t.weight === 600 ? 'SemiBold' : t.weight === 500 ? 'Medium' : 'Regular'} · {t.size}/{t.lineHeight}
              {t.letterSpacing ? ` · ${t.letterSpacing}` : ''} · {t.usage}
            </p>
            <p className={`${t.className} flex items-center gap-1 text-text-primary`}>
              {t.className.startsWith('price') ? <Price amount={Number(t.sample)} size={t.className === 'price-l' ? 'lg' : 'md'} /> : t.sample}
            </p>
          </div>
        ))}
      </div>
    </Block>
  )
}

function RadiusBlock() {
  const radii = [
    { cls: 'rounded-2', label: '2', use: 'Tags' },
    { cls: 'rounded-4', label: '4', use: 'Inputs, chips' },
    { cls: 'rounded-8', label: '8', use: 'Cards, toasts' },
    { cls: 'rounded-full', label: 'Full', use: 'Buttons, steppers' },
  ]
  return (
    <Block title="Radius and spacing" desc="Low corner radius keeps the interface crisp. Spacing follows a 4px grid. Bottom sheets have no radius.">
      <div className="grid grid-cols-4 gap-3">
        {radii.map((r) => (
          <div key={r.cls} className="flex flex-col gap-1">
            <div className={`h-12 bg-surface-muted inset-ring inset-ring-border-default ${r.cls}`} />
            <p className="label-s">Radius {r.label}</p>
            <p className="caption text-text-tertiary">{r.use}</p>
          </div>
        ))}
      </div>
      <Row label="Spacing">
        {[4, 8, 12, 16, 24, 32].map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <span className="bg-surface-inverse" style={{ width: s, height: s }} />
            <span className="caption text-text-tertiary">{s}px</span>
          </div>
        ))}
      </Row>
      <Row label="Riyal sign (SarIcon)">
        <SarIcon size={12} />
        <SarIcon size={20} />
        <SarIcon size={32} />
        <p className="body-s text-text-secondary">Drawn as a vector. Never type the character.</p>
      </Row>
    </Block>
  )
}

function IconsBlock() {
  return (
    <Block title="Icons" desc={`Stroke icons on a 24px grid, 1.75px stroke. ${iconNames.length} exported from Figma.`}>
      <div className="grid grid-cols-6 gap-y-3">
        {iconNames.map((n) => (
          <div key={n} className="flex flex-col items-center gap-1" title={n}>
            <Icon name={n} size={24} />
            <span className="w-full truncate text-center text-[10px] leading-3 text-text-tertiary">{n}</span>
          </div>
        ))}
      </div>
    </Block>
  )
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

const buttonVariants: ButtonVariant[] = ['primary', 'secondary', 'tertiary', 'ghost', 'disabled', 'destructive']

function ButtonBlock() {
  const [placing, setPlacing] = useState(false)
  const place = () => {
    setPlacing(true)
    window.setTimeout(() => setPlacing(false), 1000)
  }
  return (
    <Block title="Button" desc="Variant × Size. Barlow Semi Condensed label (CTA/L 52px, CTA/M 44px). Leading icon, price and Loading state.">
      {buttonVariants.map((v) => (
        <Row key={v} label={v[0].toUpperCase() + v.slice(1)}>
          <Button variant={v}>Button</Button>
          <Button variant={v} size="md">
            Button
          </Button>
          <Button variant={v} loading>
            Button
          </Button>
          <Button variant={v} size="md" loading>
            Button
          </Button>
        </Row>
      ))}
      <Row label="Leading icon">
        <Button variant="tertiary" size="md" leadingIcon="nav">
          Directions
        </Button>
        <Button variant="secondary" size="md" leadingIcon="plus">
          Add card
        </Button>
      </Row>
      <Row label="With price, full width" wrap={false}>
        <Button fullWidth price={43}>
          Add to order
        </Button>
        <Button fullWidth variant="secondary" price={15}>
          Add fries
        </Button>
      </Row>
      <Row label="Try it: loading for 1 second" wrap={false}>
        <Button fullWidth loading={placing} onClick={place}>
          Place order
        </Button>
      </Row>
    </Block>
  )
}

const iconStyles: IconButtonStyle[] = ['ghost', 'outline', 'elevated', 'solid']

function IconButtonBlock() {
  return (
    <Block title="Icon button" desc="Fully rounded. 40px default, 32px compact.">
      {iconStyles.map((s) => (
        <Row key={s} label={s[0].toUpperCase() + s.slice(1)}>
          <IconButton icon="x" label="Close" variant={s} />
          <IconButton icon="x" label="Close" variant={s} size={32} />
          <IconButton icon="back" label="Back" variant={s} />
          <IconButton icon="share" label="Share" variant={s} size={32} />
        </Row>
      ))}
    </Block>
  )
}

function StepperBlock() {
  const [a, setA] = useState(2)
  const [b, setB] = useState(1)
  const [c, setC] = useState(1)
  const [d, setD] = useState(3)
  return (
    <Block title="Quantity stepper" desc="Outline in cart and item sheets, Solid on menu images when an item is already in the cart. Trash at 1.">
      <Row label="Outline · Large and Small, Many">
        <QuantityStepper value={2} onChange={() => {}} />
        <QuantityStepper value={2} onChange={() => {}} size="sm" />
      </Row>
      <Row label="Outline · One (red trash)">
        <QuantityStepper value={1} onChange={() => {}} />
        <QuantityStepper value={1} onChange={() => {}} size="sm" />
      </Row>
      <Row label="Solid · Many and One (white trash)">
        <QuantityStepper value={2} onChange={() => {}} variant="solid" />
        <QuantityStepper value={2} onChange={() => {}} variant="solid" size="sm" />
        <QuantityStepper value={1} onChange={() => {}} variant="solid" />
        <QuantityStepper value={1} onChange={() => {}} variant="solid" size="sm" />
      </Row>
      <Row label="Try it (min 0, max 5)">
        <QuantityStepper value={a} onChange={setA} max={5} itemName="Salt Burger" />
        <QuantityStepper value={b} onChange={setB} size="sm" max={5} />
        <QuantityStepper value={c} onChange={setC} variant="solid" max={5} />
        <QuantityStepper value={d} onChange={setD} variant="solid" size="sm" max={5} />
      </Row>
    </Block>
  )
}

/* ------------------------------------------------------------------ */
/* Labels and prices                                                   */
/* ------------------------------------------------------------------ */

const priceSizes: PriceSize[] = ['sm', 'md', 'lg', 'cta']
const priceTones: Exclude<PriceTone, 'inherit'>[] = ['default', 'muted', 'inverse']

function PriceBlock() {
  return (
    <Block title="Price" desc="Size × Tone. The riyal sign is the SarIcon vector, then the amount.">
      {priceTones.map((t) => (
        <Row key={t} label={t[0].toUpperCase() + t.slice(1)}>
          <div className={`flex flex-wrap items-center gap-5 rounded-4 ${t === 'inverse' ? 'bg-surface-inverse px-3 py-2' : ''}`}>
            {priceSizes.map((s) => (
              <Price key={s} amount={24} size={s} tone={t} />
            ))}
          </div>
        </Row>
      ))}
      <Row label="Old price">
        <Price amount={52} size="sm" tone="muted" strike />
        <Price amount={43} size="md" />
      </Row>
    </Block>
  )
}

const badges: BadgeVariant[] = ['solid', 'subtle', 'outline', 'success', 'promo', 'error']

function BadgeBlock() {
  return (
    <Block title="Badge" desc="Status and labels. Solid = emphasis (Best seller, Closed), Subtle = neutral status, Outline = optional.">
      <Row>
        {badges.map((b) => (
          <Badge key={b} variant={b}>
            Best seller
          </Badge>
        ))}
      </Row>
      <Row label="In use">
        <Badge variant="success">Open · until 02:00</Badge>
        <Badge variant="solid">Closed</Badge>
        <Badge variant="error">Cancelled · refunded</Badge>
        <Badge variant="subtle">Picked up</Badge>
      </Row>
    </Block>
  )
}

function ChipBlock() {
  const slots = ['19:00', '19:15', '19:30', '19:45', '20:00']
  const [slot, setSlot] = useState('19:15')
  return (
    <Block title="Chip" desc="Selectable pill for time slots and filters.">
      <Row label="Default, Selected, Disabled">
        <Chip>19:15</Chip>
        <Chip selected>19:15</Chip>
        <Chip disabled>19:15</Chip>
      </Row>
      <Row label="Try it">
        {slots.map((s) => (
          <Chip key={s} selected={slot === s} onClick={() => setSlot(s)} disabled={s === '20:00'}>
            {s}
          </Chip>
        ))}
      </Row>
    </Block>
  )
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

function InputBlock() {
  const [phone, setPhone] = useState('55 123 4567')
  const [name, setName] = useState('')
  const [search, setSearch] = useState('Olaya')
  return (
    <Block title="Input" desc="State × Content. Label, Value, Leading icon, Prefix (+966), Clear button, Helper.">
      <Row label="Default · Filled and Placeholder" wrap={false}>
        <Input label="Full name" value="Noura Al Qahtani" onChange={() => {}} />
        <Input label="Full name" value="" placeholder="Your name" onChange={() => {}} />
      </Row>
      <Row label="Focused" wrap={false}>
        <Input label="Full name" value="Noura Al Qahtani" onChange={() => {}} forceFocus />
      </Row>
      <Row label="Error" wrap={false}>
        <Input
          label="Mobile number"
          prefix="+966"
          value="12 345"
          onChange={() => {}}
          error="Saudi mobile numbers have 9 digits and start with 5."
          inputMode="tel"
        />
      </Row>
      <Row label="Disabled" wrap={false}>
        <Input label="Email" value="noura@example.com" onChange={() => {}} disabled />
      </Row>
      <Row label="Try it: prefix, clear button, helper" wrap={false}>
        <Input
          label="Mobile number"
          prefix="+966"
          value={phone}
          onChange={setPhone}
          clearable
          inputMode="tel"
          helper="We’ll text you a 6-digit code."
          error={phone && !/^5\d{8}$/.test(phone.replace(/\s/g, '')) ? 'Enter 9 digits starting with 5.' : undefined}
        />
        <Input label="Name on order" value={name} onChange={setName} placeholder="e.g. Noura" clearable />
        <Input value={search} onChange={setSearch} leadingIcon="search" clearable placeholder="Search area, mall or street" aria-label="Search" />
      </Row>
    </Block>
  )
}

function TextareaBlock() {
  const [note, setNote] = useState('')
  return (
    <Block title="Textarea" desc="Multi-line note field.">
      <Row label="Placeholder and Filled" wrap={false}>
        <Textarea value="" onChange={() => {}} placeholder="e.g. less ice" aria-label="Note" />
        <Textarea value="Less ice, please" onChange={() => {}} aria-label="Note" />
      </Row>
      <Row label="Try it: label and counter" wrap={false}>
        <Textarea label="Note for the store" value={note} onChange={setNote} placeholder="e.g. less ice" maxLength={140} />
      </Row>
    </Block>
  )
}

const branches: SelectOption[] = [
  { value: 'u-walk', label: 'SALT U Walk' },
  { value: 'al-aqiq', label: 'SALT Al Aqiq' },
  { value: 'kafd', label: 'SALT KAFD' },
  { value: 'al-khobar', label: 'SALT Al Khobar', disabled: true },
]

const arrivals: SelectOption[] = [
  { value: '1915', caption: 'Today, Tue 29 Sep', label: '19:15 · in about 30 min' },
  { value: '1930', caption: 'Today, Tue 29 Sep', label: '19:30 · in about 45 min' },
  { value: '1945', caption: 'Today, Tue 29 Sep', label: '19:45 · in about 1 hour', disabled: true },
  { value: '2000', caption: 'Today, Tue 29 Sep', label: '20:00 · in about 1 hour 15 min' },
]

function SelectBlock() {
  const [branch, setBranch] = useState<string | null>(null)
  const [arrival, setArrival] = useState<string | null>('1915')
  const [city, setCity] = useState<string | null>('riyadh')
  return (
    <Block title="Select" desc="Dropdown field that opens a list. Unavailable options stay visible but disabled.">
      <Row label="Placeholder" wrap={false}>
        <Select label="Store" options={branches} value={branch} onChange={setBranch} placeholder="Choose a store" />
      </Row>
      <Row label="Arrival select: icon and caption" wrap={false}>
        <Select options={arrivals} value={arrival} onChange={setArrival} leadingIcon="clock" />
      </Row>
      <Row label="Error and Disabled" wrap={false}>
        <Select label="Store" options={branches} value={null} onChange={() => {}} placeholder="Choose a store" error="Choose a store to continue." />
        <Select label="City" options={[{ value: 'riyadh', label: 'Riyadh' }]} value={city} onChange={setCity} disabled />
      </Row>
      <Row label="Open" wrap={false}>
        <div className="min-h-[248px]">
          <Select label="Store" options={branches} value="al-aqiq" onChange={() => {}} defaultOpen />
        </div>
      </Row>
    </Block>
  )
}

function OptionRowBlock() {
  const [milk, setMilk] = useState('oat')
  const [extras, setExtras] = useState<Record<string, boolean>>({ jalapeno: true })
  const [shots, setShots] = useState(0)
  return (
    <Block title="Option row" desc="Control × Selected. Used in item customisation. Surcharge shows a Price.">
      <Row label="Radio · Yes, No, Unavailable" wrap={false}>
        <div className="flex flex-col">
          <OptionRow control="radio" label="Oat milk" selected onChange={() => {}} name="demo-r" />
          <OptionRow control="radio" label="Oat milk" selected={false} onChange={() => {}} name="demo-r" />
          <OptionRow control="radio" label="Oat milk" selected={false} onChange={() => {}} unavailable name="demo-r" />
        </div>
      </Row>
      <Row label="Checkbox · Yes, No, Unavailable" wrap={false}>
        <div className="flex flex-col">
          <OptionRow control="checkbox" label="Oat milk" selected onChange={() => {}} />
          <OptionRow control="checkbox" label="Oat milk" selected={false} onChange={() => {}} />
          <OptionRow control="checkbox" label="Oat milk" selected={false} onChange={() => {}} unavailable />
        </div>
      </Row>
      <Row label="Stepper · No, Yes, Unavailable" wrap={false}>
        <div className="flex flex-col">
          <OptionRow control="stepper" label="Oat milk" quantity={0} onQuantityChange={() => {}} />
          <OptionRow control="stepper" label="Oat milk" quantity={1} onQuantityChange={() => {}} />
          <OptionRow control="stepper" label="Oat milk" quantity={0} onQuantityChange={() => {}} unavailable />
        </div>
      </Row>
      <Row label="Try it: Spanish Latte" wrap={false}>
        <div className="flex flex-col">
          <p className="overline-text pt-2 text-text-tertiary">Milk · pick 1</p>
          {[
            { id: 'full', label: 'Full fat milk' },
            { id: 'oat', label: 'Oat milk', surcharge: 5 },
            { id: 'almond', label: 'Almond milk', surcharge: 5, unavailable: true },
          ].map((o) => (
            <OptionRow
              key={o.id}
              control="radio"
              name="milk"
              label={o.label}
              surcharge={o.surcharge}
              unavailable={o.unavailable}
              selected={milk === o.id}
              onChange={() => setMilk(o.id)}
            />
          ))}
          <p className="overline-text pt-4 text-text-tertiary">Add extra · optional</p>
          {[
            { id: 'jalapeno', label: 'Extra jalapeño', surcharge: 3 },
            { id: 'pickle', label: 'Pickle', surcharge: 2 },
          ].map((o) => (
            <OptionRow
              key={o.id}
              control="checkbox"
              label={o.label}
              surcharge={o.surcharge}
              selected={Boolean(extras[o.id])}
              onChange={(v) => setExtras((e) => ({ ...e, [o.id]: v }))}
            />
          ))}
          <OptionRow control="stepper" label="Extra espresso shot" surcharge={5} quantity={shots} onQuantityChange={setShots} max={3} />
        </div>
      </Row>
    </Block>
  )
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

const noticeTones: NoticeTone[] = ['neutral', 'warning', 'error', 'success']
const allergyCopy = 'Allergies can’t be handled through notes. Please speak to our staff when you collect your order.'

function NoticeBlock() {
  return (
    <Block title="Notice" desc="Inline message inside a page or sheet. Tone × Size. Default has an optional title.">
      <Row label="Default" wrap={false}>
        {noticeTones.map((t) => (
          <Notice key={t} tone={t}>
            {allergyCopy}
          </Notice>
        ))}
        <Notice tone="warning" title="Heads up" icon="alert">
          Extra jalapeño is unavailable, so we removed it.
        </Notice>
      </Row>
      <Row label="Compact" wrap={false}>
        {noticeTones.map((t) => (
          <Notice key={t} tone={t} size="compact">
            {allergyCopy}
          </Notice>
        ))}
      </Row>
    </Block>
  )
}

function ToastBlock() {
  const toast = useToast()
  return (
    <Block title="Toast" desc="Short confirmation shown above the bottom bar for about 3 s. Success, Info, Error. Optional action.">
      <Row label="Success, Info, Error" wrap={false}>
        <Toast type="success" message="Email verified" />
        <Toast type="info" message="Your cart is saved on this device" />
        <Toast type="error" message="Couldn’t reach the store. Try again." />
        <Toast type="success" message="Removed Salt Burger" action={{ label: 'Undo', onClick: () => {} }} />
      </Row>
      <Row label="Try it">
        <Button size="md" variant="secondary" onClick={() => toast.show({ type: 'success', message: 'Added to your order' })}>
          Success
        </Button>
        <Button size="md" variant="secondary" onClick={() => toast.show({ type: 'info', message: 'Store closes at 02:00' })}>
          Info
        </Button>
        <Button
          size="md"
          variant="secondary"
          onClick={() =>
            toast.show({
              type: 'success',
              message: 'Removed Salt Burger',
              action: { label: 'Undo', onClick: () => toast.show({ type: 'info', message: 'Salt Burger is back in your cart' }) },
            })
          }
        >
          With Undo
        </Button>
      </Row>
    </Block>
  )
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

function TopBarBlock() {
  return (
    <Block title="Top bar" desc="Screen header with a 1px bottom border. Leading: Back, Close or None. Trailing is an Icon button.">
      <div className="-mx-4 flex flex-col gap-3 bg-surface-muted py-3">
        <TopBar title="Payment details" leading="back" sticky={false} onLeading={() => {}} />
        <TopBar title="Add a car" leading="close" sticky={false} onLeading={() => {}} />
        <TopBar title="Orders" leading="none" sticky={false} />
        <TopBar
          title="Order SLT-24091"
          leading="back"
          sticky={false}
          onLeading={() => {}}
          trailing={<IconButton icon="share" label="Share order" />}
        />
      </div>
    </Block>
  )
}

function TabsBlock() {
  const items = [
    { id: 'burgers', label: 'Burgers' },
    { id: 'sliders', label: 'Sliders' },
    { id: 'fries', label: 'Fries' },
    { id: 'little', label: 'Little Salters' },
    { id: 'sides', label: 'Sides' },
    { id: 'softies', label: 'Softies & shakes' },
    { id: 'drinks', label: 'Drinks' },
  ]
  const [tab, setTab] = useState('burgers')
  return (
    <Block title="Tabs" desc="Figma Category tab: menu category navigation. Scrolls sideways; arrow keys move between tabs.">
      <div className="-mx-4">
        <Tabs items={items} value={tab} onChange={setTab} label="Menu categories" />
      </div>
      <p className="body-s text-text-secondary">Selected: {items.find((i) => i.id === tab)?.label}</p>
      <Row label="Radio and Checkbox marks">
        <RadioMark checked />
        <RadioMark checked={false} />
        <CheckboxMark checked />
        <CheckboxMark checked={false} />
      </Row>
    </Block>
  )
}

/* ------------------------------------------------------------------ */
/* Sheets                                                              */
/* ------------------------------------------------------------------ */

function SheetBlock() {
  const [which, setWhich] = useState<'none' | 'basic' | 'steps' | 'product'>('none')
  const [step, setStep] = useState(1)
  const [qty, setQty] = useState(1)
  const [fries, setFries] = useState('none')
  const [adding, setAdding] = useState(false)
  const toast = useToast()
  const close = () => setWhich('none')

  return (
    <Block title="Bottom sheet" desc="No corner radius, black 55% overlay, slides up, close top right. Optional title and back arrow.">
      <Row wrap={false}>
        <Button variant="secondary" fullWidth onClick={() => setWhich('basic')}>
          Confirmation sheet
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setStep(1)
            setWhich('steps')
          }}
        >
          Two-step sheet with back
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setWhich('product')}>
          Item sheet with footer
        </Button>
      </Row>

      <BottomSheet open={which === 'basic'} onClose={close} ariaLabel="Log out">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Icon name="logout" size={40} />
            <h2 className="title-l pt-3">Log out of SALT?</h2>
            <p className="body-m text-text-secondary">
              Your cart will be saved on this device. You’ll need your mobile number to log back in.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="destructive" fullWidth onClick={close}>
              Log out
            </Button>
            <Button variant="secondary" fullWidth onClick={close}>
              Stay logged in
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={which === 'steps'}
        onClose={close}
        title={step === 1 ? 'Payment method' : 'Add a card'}
        onBack={step === 2 ? () => setStep(1) : undefined}
      >
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <Notice size="compact">Your card is saved securely. We only keep the last 4 digits.</Notice>
            <Button variant="secondary" leadingIcon="plus" fullWidth onClick={() => setStep(2)}>
              Add a new card
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input label="Card number" value="" onChange={() => {}} placeholder="0000 0000 0000 0000" inputMode="numeric" />
            <Button fullWidth onClick={close}>
              Save card
            </Button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={which === 'product'}
        onClose={close}
        title="Salt Burger"
        titleStyle="product"
        footer={
          <div className="flex items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} min={1} trashAtOne={false} itemName="Salt Burger" />
            <Button
              className="flex-1"
              price={(43 + (fries === 'none' ? 0 : 15)) * qty}
              loading={adding}
              onClick={() => {
                setAdding(true)
                window.setTimeout(() => {
                  setAdding(false)
                  close()
                  toast.show({ type: 'success', message: 'Added to your order' })
                }, 1000)
              }}
            >
              Add
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="body-m text-text-secondary">2 Wagyu beef patties, cheese, onions and our Secret Sauce</p>
          <Price amount={43} size="lg" />
          <div className="flex flex-col">
            <p className="overline-text pt-2 text-text-tertiary">Add fries · pick up to 1</p>
            <OptionRow control="radio" name="fries" label="No fries" selected={fries === 'none'} onChange={() => setFries('none')} />
            <OptionRow control="radio" name="fries" label="Original Fries" surcharge={15} selected={fries === 'orig'} onChange={() => setFries('orig')} />
            <OptionRow control="radio" name="fries" label="Truffle Fries" surcharge={22} selected={false} onChange={() => {}} unavailable />
          </div>
          <Notice tone="neutral" size="compact">
            {allergyCopy}
          </Notice>
        </div>
      </BottomSheet>
    </Block>
  )
}
