import type { ReactNode } from 'react'

/** Labeled control for admin forms. */
export function AdminField({
  label,
  children,
  full,
  hint,
}: {
  label: string
  children: ReactNode
  full?: boolean
  hint?: string
}) {
  return (
    <label className={`admin-field${full ? ' admin-field--full' : ''}`}>
      <span className="admin-field__label">{label}</span>
      {children}
      {hint ? <span className="admin-field__hint">{hint}</span> : null}
    </label>
  )
}

export function AdminCheckGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <fieldset className="admin-check-group">
      <legend>{label}</legend>
      <div className="admin-check-grid">{children}</div>
    </fieldset>
  )
}

export function AdminCheck({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="admin-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
