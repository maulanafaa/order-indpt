import { useParams } from 'react-router'
import { PlaceholderPage } from '../components/layout/PlaceholderPage'

export default function OrderPage() {
  const { id } = useParams()
  return <PlaceholderPage title={`Order ${id}`} stage="stage 5 (Order tracking, Profile and Help)" />
}
