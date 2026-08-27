import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Categories from '../components/Categories'
import OfficerSection from '../components/OfficerSection'
import Stats from '../components/Stats'
import CtaBanner from '../components/CtaBanner'

/**
 * The homepage. It is just a stack of sections in reading order:
 *
 *   Hero          -> what the site is and the two main actions
 *   HowItWorks    -> the 3-step flow
 *   Categories    -> the 6 things you can report
 *   Stats         -> headline figures
 *   OfficerSection-> the AI photo-check, explained for officers
 *   CtaBanner     -> final nudge to report
 *
 * Navbar and Footer are rendered once in App.jsx so they appear on every page.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Categories />
      <Stats />
      <OfficerSection />
      <CtaBanner />
    </>
  )
}
