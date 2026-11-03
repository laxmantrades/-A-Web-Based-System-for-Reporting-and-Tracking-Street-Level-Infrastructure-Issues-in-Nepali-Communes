import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Categories from '../components/Categories'
import Stats from '../components/Stats'
import CtaBanner from '../components/CtaBanner'

// Homepage: Hero, Stats, HowItWorks, Categories, CtaBanner.
// Navbar and footer come from the layout.
export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <HowItWorks />
      <Categories />
      <CtaBanner />
    </>
  )
}
