import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import ComingSoon from './pages/ComingSoon'

/**
 * App shell: the Navbar and Footer wrap every page, and <Routes> swaps the
 * middle based on the URL.
 *
 * Only "/" is a real page today. The other routes render a placeholder so the
 * links in the navbar and footer still go somewhere sensible.
 */
export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ComingSoon title="Report an issue" />} />
          <Route path="/track" element={<ComingSoon title="Track a report" />} />
          <Route path="/officer" element={<ComingSoon title="Officer dashboard" />} />
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
