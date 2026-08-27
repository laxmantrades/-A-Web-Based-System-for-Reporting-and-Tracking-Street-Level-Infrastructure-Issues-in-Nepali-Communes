/*
 * Central place for site-wide text and constants.
 *
 * Keeping copy here (instead of hard-coding it inside components) means a
 * non-developer can tweak wording, and translating the UI to Nepali later is
 * just a matter of swapping this file.
 */
export const site = {
  name: 'MeroSadak',
  // "मेरो सडक" = "my street" in Nepali.
  tagline: 'Report street problems in your ward. Track the fix.',
  description:
    'A simple way for citizens in Nepal to report potholes, broken streetlights, blocked drains and other street problems — and follow what happens next.',

  // Anchor links used by the navbar. `href` values match the `id` on each
  // <section> in the homepage.
  nav: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'What you can report', href: '#categories' },
    { label: 'For ward officers', href: '#officers' },
  ],

  // Placeholder figures for the prototype. Replace with real query results
  // once the backend is connected.
  stats: [
    { value: '6', label: 'Street-issue categories' },
    { value: '3', label: 'Confidence levels on the AI photo check' },
    { value: '24/7', label: 'Report any time, no office visit' },
  ],
}
