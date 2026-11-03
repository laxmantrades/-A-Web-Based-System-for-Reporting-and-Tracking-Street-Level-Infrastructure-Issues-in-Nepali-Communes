import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

import Logo from './Logo'
import { site } from '../data/site'

// Top navbar. Gets a shadow on scroll, collapses into a menu on small screens.
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    // passive = smoother scrolling
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={`sticky top-0 z-50 bg-white/90 backdrop-blur transition-shadow ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <nav className="section-shell flex h-16 items-center justify-between">
        <Link to="/" onClick={closeMenu} aria-label={`${site.name} home`}>
          <Logo />
        </Link>

        {/* desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {site.nav.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* desktop buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/track" className="btn-ghost">
            Track a report
          </Link>
          <Link to="/report" className="btn-primary">
            Report an issue
          </Link>
        </div>

        {/* mobile menu button */}
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <ul className="section-shell flex flex-col gap-1 py-3">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={closeMenu}
                  className="block rounded-md px-2 py-2 text-sm font-medium text-ink-soft hover:bg-slate-50 hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2">
              <Link to="/track" onClick={closeMenu} className="btn-ghost w-full">
                Track a report
              </Link>
              <Link to="/report" onClick={closeMenu} className="btn-primary w-full">
                Report an issue
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
