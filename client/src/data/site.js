/* Site text and constants in one place (easy to change or translate later). */
export const site = {
  name: 'MeroSadak',
  // "मेरो सडक" = "my street"
  tagline: 'Report street problems in your ward. Track the fix.',
  description:
    'A simple way for citizens in Nepal to report potholes, broken streetlights, blocked drains and other street problems — and follow what happens next.',

  // placeholder support email
  contactEmail: 'help@merosadak.org.np',
  // placeholder email for complaints about a public report
  moderationEmail: 'moderation@merosadak.org.np',

  // homepage section links for navbar and footer ("/" makes them work from any page)
  nav: [
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'What you can report', href: '/#categories' },
  ],

  // stats under the hero
  stats: [
    { value: '6', label: 'Street-issue categories' },
    { value: '~1 min', label: 'To file a report' },
    { value: '24/7', label: 'Report any time, no office visit' },
    { value: 'Free', label: 'No account needed' },
  ],
}
