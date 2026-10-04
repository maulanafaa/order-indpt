import { CheckboxMark } from './Controls'

/** A checkbox with a Body/M label, e.g. "Save this card for next time". */
export function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 body-m text-text-primary">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <CheckboxMark checked={checked} />
      {label}
    </label>
  )
}
