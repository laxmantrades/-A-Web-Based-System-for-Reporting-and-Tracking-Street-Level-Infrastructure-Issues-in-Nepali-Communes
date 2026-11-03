import { Check } from 'lucide-react'

import { categories } from '../../data/categories'

// the six categories as tiles, works like radio buttons.
// value = selected id or '', onChange(id)
export default function CategoryPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {categories.map((category) => {
        const selected = value === category.id

        return (
          <label
            key={category.id}
            className={[
              'relative flex cursor-pointer flex-col items-start gap-3 rounded-2xl p-4 transition-all',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600',
              selected
                ? 'bg-brand-50/60 ring-2 ring-brand-600'
                : 'bg-white ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300',
            ].join(' ')}
          >
            <input
              type="radio"
              name="category"
              value={category.id}
              checked={selected}
              onChange={() => onChange(category.id)}
              className="sr-only"
            />
            <span className={`grid h-11 w-11 place-items-center rounded-xl ${category.tint}`}>
              <category.Icon size={22} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold leading-snug text-ink">{category.label}</span>
            {selected && (
              <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white shadow">
                <Check size={14} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
