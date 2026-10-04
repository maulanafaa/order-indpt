import { PlaceholderPage } from '../components/layout/PlaceholderPage'

export default function FindStorePage() {
  return (
    <PlaceholderPage title="Find a store" leading="none" stage="stage 2 (Find a store and menu)">
      <div className="flex flex-col gap-2">
        <h2 className="title-xl">Order ahead, skip the line</h2>
        <p className="body-l text-text-secondary">Allow location access so we can show the closest store.</p>
      </div>
    </PlaceholderPage>
  )
}
