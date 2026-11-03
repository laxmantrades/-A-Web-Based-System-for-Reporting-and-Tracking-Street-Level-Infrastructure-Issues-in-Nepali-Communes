import PageHero, { PageBody } from '../components/PageHero'
import PublicReportsFeed from '../components/reports/PublicReportsFeed'

export default function PublicReports() {
  return (
    <>
      <PageHero
        eyebrow="Community"
        title="Community reports"
        subtitle="See what neighbours are reporting across the city, and what has already been fixed."
      />
      <PageBody>
        <PublicReportsFeed />
      </PageBody>
    </>
  )
}
