import { Link } from 'react-router-dom'

/** Compact header brand — Foodporium wordmark. */
export function FoodporiumBrand({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`fp-brand ${className}`.trim()} aria-label="Foodporium home">
      <span className="fp-brand__text">Foodporium</span>
    </Link>
  )
}
