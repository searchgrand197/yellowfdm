import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCartMagic } from '../context/CartMagicContext'
import { useCart } from '../context/CartContext'
import type { MenuItem } from '../types'
import { formatMoney } from '../utils/money'

export type ComboDeal = {
  id: string
  title: string
  badge: string
  tagline: string
  items: MenuItem[]
  /** Uploaded combo photo — used when set; otherwise item collage. */
  imageUrl?: string
  /** @deprecated use items[0] */
  primary: MenuItem
  /** @deprecated use items[1] */
  side: MenuItem
  saveAmount: number
  comboPrice: number
  accent: number
}

export function ComboCarousel({ combos }: { combos: ComboDeal[] }) {
  const { addItem } = useCart()
  const { launch } = useCartMagic()
  const [addedId, setAddedId] = useState<string | null>(null)

  if (!combos.length) return null

  const orderCombo = (combo: ComboDeal, el: HTMLElement) => {
    combo.items.forEach((item) => addItem(item, 1))
    launch(el)
    setAddedId(combo.id)
    window.setTimeout(() => setAddedId(null), 1400)
  }

  return (
    <div className="combo-carousel">
      {combos.map((combo) => {
        const parts = combo.items?.length ? combo.items : [combo.primary, combo.side]
        const separate = parts.reduce((sum, i) => sum + Number(i.price), 0)
        const photo = (combo.imageUrl || '').trim()
        return (
          <article
            key={combo.id}
            className={`combo-card combo-card--a${combo.accent}`}
          >
            <div className="combo-card__glow" aria-hidden />
            <div className="combo-card__ribbon">Save {formatMoney(combo.saveAmount)}</div>

            <div className="combo-card__media">
              <span className="combo-card__badge">{combo.badge}</span>
              {photo ? (
                <div className="combo-card__hero">
                  <img src={photo} alt={combo.title} className="combo-card__hero-img" />
                </div>
              ) : (
                <div className={`combo-card__plates combo-card__plates--n${Math.min(parts.length, 4)}`}>
                  {parts.map((item, i) => (
                    <span key={`${combo.id}-${item.id}-${i}`} className="combo-card__plate">
                      {i > 0 ? (
                        <span className="combo-card__plus" aria-hidden>
                          <Plus size={14} strokeWidth={3} />
                        </span>
                      ) : null}
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className={`combo-card__img${i === 0 ? ' combo-card__img--main' : ' combo-card__img--side'}`}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="combo-card__body">
              <p className="combo-card__tagline">{combo.tagline}</p>
              <h3>{combo.title}</h3>
              <p className="combo-card__items">
                {parts.map((item, i) => (
                  <span key={`${item.id}-name`}>
                    {i > 0 ? <span>+</span> : null}
                    {item.name}
                  </span>
                ))}
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
