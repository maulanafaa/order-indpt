import '@fontsource/barlow-semi-condensed/500.css'
import '@fontsource/barlow-semi-condensed/600.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { loadCatalog } from './lib/catalog'

// Stores and menu come from Supabase when it is set up and seeded, else from src/data.
// The router is imported after, so nothing reads the catalog before it is in place.
void loadCatalog().then(async () => {
  const { router } = await import('./router')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
})
