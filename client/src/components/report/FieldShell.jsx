// Wrapper for a form field: label, control, hint, error.
// Props: as ('div' or 'fieldset' for radio groups), label, htmlFor, required,
// hint, error, step (number badge), children
export default function FieldShell({
  as = 'div',
  label,
  htmlFor,
  required = false,
  hint,
  error,
  step,
  children,
}) {
  const Wrapper = as
  // legend for groups, label for one control, span for widgets with no single input
  const LabelTag = as === 'fieldset' ? 'legend' : htmlFor ? 'label' : 'span'

  return (
    <Wrapper className="min-w-0">
      <LabelTag
        htmlFor={LabelTag === 'label' ? htmlFor : undefined}
        className="flex items-center gap-2.5 text-base font-bold text-ink"
      >
        {step && (
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
              error ? 'bg-brand-600 text-white' : 'bg-slate-900 text-white'
            }`}
            aria-hidden="true"
          >
            {step}
          </span>
        )}
        <span>
          {label}
          {required && (
            <span className="text-brand-600" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </span>
      </LabelTag>

      <div className="mt-3">{children}</div>

      {hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}

      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-brand-700">
          {error}
        </p>
      )}
    </Wrapper>
  )
}
