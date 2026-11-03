import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import App from './App.jsx'
import ToastProvider from './components/ToastProvider.jsx'

/*
 * Starts the React app inside <div id="root">.
 * StrictMode: dev-only warnings. BrowserRouter: page routing.
 * ToastProvider is on top so toasts stay when changing page.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
