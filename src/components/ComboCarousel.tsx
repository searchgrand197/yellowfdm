import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCartMagic } from '../context/CartMagicContext'
import { useCart } from '../context/CartContext'
import type { MenuItem } from '../types'
import { hasNoBackground } from '../utils/images'
import { formatMoney } from '../utils/money'

export type ComboDeal = {
  id: string
  title: string
  badge: string
  tagline: string
  primary: MenuItem
  side: MenuItem
  saveAmount: number
  comboPrice: number
  accent: number
}

const ACCENTS = [
  { badge: 'Hot deal', tagline: 'Most loved pairing' },
  { badge: 'Best value', tagline: 'Extra crispy combo' },
  { badge: 'Chef pick', tagline: 'Kitchen favourite' },
  { badge: 'Limited', tagline: 'Only today' },
  { badge: 'Street special', tagline: 'Bold & filling' },
  { badge: 'Quick bite', tagline: 'Ready in minutes' },
]

export function buildCombos(pool: MenuItem[]): ComboDeal[] {
  const cutouts = pool.filter((i) => hasNoBackground(i.image_url))
  const byCat = (slug: string) => cutouts.filter((i) => i.category_slug === slug)
  const burgers = byCat('burger')
  const fries = byCat('fries')
  const pizzas = byCat('pizza')
  const momos = byCat('momo')
  const pastas = byCat('pasta')
  const sandwiches = byCat('sandwich')
  const sides = fries.length
    ? fries
    : cutouts.filter((i) => !burgers.some((b) => b.id === i.id))

  const pairs: Array<[MenuItem | undefined, MenuItem | undefined, string]> = [
    [burgers[0], fries[0] || sides[0], 'Burger Combo'],
    [burgers[1] || burgers[0], fries[1] || fries[0] || sides[1], 'Power Meal'],
    [pizzas[0], fries[0] || sides[0], 'Pizza Duo'],
    [pizzas[1] || pizzas[0], sandwiches[0] || sides[1], 'Pizza Night'],
    [momos[0], fries[0] || sides[0], 'Momo Feast'],
    [pastas[0], sandwiches[0] || sides[0], 'Pasta Plate'],
    [sandwiches[0], fries[0] || sides[0], 'Snack Stack'],
  ]

  return pairs
    .filter((p): p is [MenuItem, MenuItem, string] => Boolean(p[0] && p[1] && p[0].id !== p[1].id))
    .map(([primary, side, title], idx) => {
      const total = Number(primary.price) + Number(side.price)
      const saveAmount = Math.max(15, Math.round(total * 0.15))
      const accent = ACCENTS[idx % ACCENTS.length]
      return {
        id: `combo-${primary.id}-${side.id}-${idx}`,
        title,
        badge: accent.badge,
        tagline: accent.tagline,
        primary,
        side,
        saveAmount,
        comboPrice: Math.max(1, Math.round(total - saveAmount)),
        accent: idx % 3,
      }
    })
}

export function ComboCarousel({ combos }: { combos: ComboDeal[] }) {
  const { addItem } = useCart()
  const { launch } = useCartMagic()
  const [addedId, setAddedId] = useState<string | null>(null)

  if (!combos.length) return null

  const orderCombo = (combo: ComboDeal, el: HTMLElement) => {
    addItem(combo.primary, 1)
    addItem(combo.side, 1)
    launch(el)
    setAddedId(combo.id)
    window.setTimeout(() => setAddedId(null), 1400)
  }

  return (
    <div className="combo-carousel">
      {combos.map((combo) => {
        const separate = Number(combo.primary.price) + Number(combo.side.price)
        return (
          <article
            key={combo.id}
            className={`combo-card combo-card--a${combo.accent}`}
          >
            <div className="combo-card__glow" aria-hidden />
            <div className="combo-card__ribbon">Save {formatMoney(combo.saveAmount)}</div>

            <div className="combo-card__media">
              <span className="combo-card__badge">{combo.badge}</span>
              <div className="combo-card__plates">
                <img
                  src={combo.primary.image_url}
                  alt={combo.primary.name}
                  className="combo-card__img combo-card__img--main"
                />
                <span className="combo-card__plus" aria-hidden>
                  <Plus size={16} strokeWidth={3} />
                </span>
                <img
                  src={combo.side.image_url}
                  alt={combo.side.name}
                  className="combo-card__img combo-card__img--side"
                />
              </div>
            </div>

            <div className="combo-card__body">
              <p className="combo-card__tagline">{combo.tagline}</p>
              <h3>{combo.title}</h3>
              <p className="combo-card__items">
                {combo.primary.name}
                <span>+</span>
                {combo.side.name}
              </p>

              <div className="combo-card__price-row">
                <strong>{formatMoney(combo.comboPrice)}</strong>
                <span className="combo-card__was">{formatMoney(separate)}</span>
              </div>

              <div className="combo-card__actions">
                <button
                  type="button"
                  className={`combo-card__order${addedId === combo.id ? ' added' : ''}`}
                  onClick={(e) => orderCombo(combo, e.currentTarget)}
                >
                  {addedId === combo.id ? 'Added to cart' : 'Grab combo'}
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function PromoCarousel({ items }: { items: MenuItem[] }) {
  if (!items.length) return null

  return (
    <div className="promo-carousel">
      {items.map((item) => (
        <section key={item.id} className="promo-banner promo-carousel__slide">
          <div className="promo-copy">
            <p className="promo-eyebrow">Combo spotlight</p>
            <h2>{item.promo_label || `${item.name} Deal`}</h2>
            <Link to="/search?view=all" className="btn btn-white">
              Order Now
            </Link>
          </div>
          <img src={item.image_url} alt={item.name} />
        </section>
      ))}
    </div>
  )
}
