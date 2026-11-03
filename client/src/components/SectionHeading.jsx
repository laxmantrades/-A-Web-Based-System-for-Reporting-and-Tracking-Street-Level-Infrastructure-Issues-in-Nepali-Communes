// Heading for each homepage section.
// Props: eyebrow, title, children (text under it), align ('center' or 'left')
export default function SectionHeading({ eyebrow, title, children, align = 'center' }) {
  const alignment = align === 'left' ? 'text-left' : 'text-center mx-auto'

  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {children && <p className="mt-4 text-lg text-ink-soft">{children}</p>}
    </div>
  )
}
