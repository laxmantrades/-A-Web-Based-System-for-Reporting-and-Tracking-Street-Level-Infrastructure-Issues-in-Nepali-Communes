import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Navbar from './Navbar'
import Footer from './Footer'

// Navbar + footer around citizen pages. Officer pages don't use this.
export default function PublicLayout() {
  const { pathname, hash, key } = useLocation()

  // router doesn't scroll to #hash by itself, so do it after render.
  // key makes clicking the same link scroll again
  useEffect(() => {
    if (!hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [pathname, hash, key])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
