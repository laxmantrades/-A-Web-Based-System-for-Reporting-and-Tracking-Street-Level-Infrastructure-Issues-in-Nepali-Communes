import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import App from './App.jsx'

/*
 * Entry point. React attaches itself to <div id="root"> from index.html.
 *
 * - <StrictMode> is a dev-only helper that surfaces unsafe patterns early.
 * - <BrowserRouter> gives us client-side routing. We only have one page today,
 *   but wiring it now means adding /report and /track later is a one-line change.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
