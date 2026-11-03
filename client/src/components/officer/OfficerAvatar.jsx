function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

// profile photo, or initials if none
export default function OfficerAvatar({ officer, className = 'h-9 w-9 text-xs' }) {
  if (officer.avatarUrl) {
    return (
      <img
        src={officer.avatarUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 font-bold text-white ${className}`}
      aria-hidden="true"
    >
      {initials(officer.name)}
    </span>
  )
}
