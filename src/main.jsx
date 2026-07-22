import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

import router from './router/reactRouter'
import './assets/scss/main.scss'

registerSW({
  immediate: true,
  onRegisteredSW(_, registration) {
    registration?.update()
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
