import { badgeFor } from '../../lib/reportStatus'

// coloured status pill. status = backend status, size = 'md' (default) or 'sm'
export default function StatusBadge({ status, size = 'md' }) {
  const { label, className, dot } = badgeFor(status)
  const sizing = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizing} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  )
}
