import { useNavigate } from 'react-router'
import { PrototypeNav } from '../components/layout/PlaceholderPage'
import { Button } from '../components/ui/Button'
import { TopBar } from '../components/ui/TopBar'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <>
      <TopBar title="Page not found" leading="none" />
      <main className="flex flex-col gap-6 px-4 pt-10 pb-10">
        <div className="flex flex-col gap-2">
          <h2 className="title-m">We can’t find that page</h2>
          <p className="body-m text-text-secondary">The link may be old or mistyped.</p>
        </div>
        <Button onClick={() => navigate('/')} fullWidth>
          Find a store
        </Button>
        <PrototypeNav />
      </main>
    </>
  )
}
