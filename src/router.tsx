import { createBrowserRouter } from 'react-router'
import { AppFrame } from './components/layout/AppFrame'
import CheckoutPage from './routes/Checkout'
import ComponentsPage from './routes/Components'
import FindStorePage from './routes/FindStore'
import HelpPage from './routes/Help'
import NotFoundPage from './routes/NotFound'
import OrderPage from './routes/Order'
import OrdersPage from './routes/Orders'
import ProfilePage from './routes/Profile'
import StorePage from './routes/Store'

export const router = createBrowserRouter([
  {
    element: <AppFrame />,
    children: [
      { path: '/', element: <FindStorePage /> },
      { path: '/store/:slug', element: <StorePage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/order/:id', element: <OrderPage /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/help', element: <HelpPage /> },
      { path: '/components', element: <ComponentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
