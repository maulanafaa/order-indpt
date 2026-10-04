import { useParams } from 'react-router'
import { PlaceholderPage } from '../components/layout/PlaceholderPage'

export default function StorePage() {
  const { slug } = useParams()
  return <PlaceholderPage title={`Store: ${slug}`} stage="stage 2 (Find a store and menu)" />
}
