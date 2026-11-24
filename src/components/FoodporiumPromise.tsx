import { Droplets, Leaf, ShieldCheck, Star } from 'lucide-react'

const POINTS = [
  { id: 'veg', label: 'Pure Veg', icon: Leaf },
  { id: 'hygiene', label: 'Hygiene', icon: ShieldCheck },
  { id: 'oil', label: 'Fresh Oil', icon: Droplets },
]

export function FoodporiumPromise() {
  return (
    <section className="fp-promise" aria-label="Foodporium Promise">
      <div className="fp-promise__head">
        <h2 className="fp-promise__title">
          <span className="fp-promise__brand">
            Foodporium
            <span className="fp-promise__swoosh" aria-hidden />
          </span>{' '}
          <span className="fp-promise__word">
            Promise
            <span className="fp-promise__stars" aria-hidden>
              <Star size={12} fill="currentColor" strokeWidth={0} />
              <Star size={9} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        </h2>
        <p className="fp-promise__tagline">Where quality food meets lowest prices!</p>
      </div>

      <ul className="fp-promise__points">
        {POINTS.map(({ id, label, icon: Icon }) => (
          <li key={id} className="fp-promise__point">
            <span className="fp-promise__icon">
              <Icon size={18} strokeWidth={2.3} />
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
