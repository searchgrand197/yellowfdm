import { Clock, Heart, Plus, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useCartMagic } from '../context/CartMagicContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { lineUnitPrice, type MenuItem, type Topping } from '../types'
import { formatMoney } from '../utils/money'
import {
  detectPizzaSize,
  displayPizzaName,
  pizzaBaseKey,
  type PizzaSize,
  type PizzaVariantMap,
} from '../utils/pizzaSizes'
import { toppingIcon, toppingLabel } from '../utils/toppingIcon'

const SIZE_ORDER: PizzaSize[] = ['S', 'M', 'L']

export function FoodCard({
  item,
  pizzaVariants,
}: {
  item: MenuItem
  index?: number
  pizzaVariants?: PizzaVariantMap
}) {
  const { addItem } = useCart()
  const { launch } = useCartMagic()
  const { isFavorite, toggle } = useFavorites()
  const [added, setAdded] = useState(false)
  const [openToppings, setOpenToppings] = useState(false)
  const [selected, setSelected] = useState<Topping[]>([])
  const [favBusy, setFavBusy] = useState(false)

  const variantRow = useMemo(() => {
    if (!pizzaVariants) return null
    const key = pizzaBaseKey(item.name)
    const row = pizzaVariants.get(key)
    if (!row) return null
    const count = SIZE_ORDER.filter((s) => row[s]).length
    return count > 1 ? row : null
  }, [item.name, pizzaVariants])

  const initialSize = detectPizzaSize(item) || 'S'
  const [size, setSize] = useState<PizzaSize>(initialSize)

  useEffect(() => {
    setSize(detectPizzaSize(item) || 'S')
    setSelected([])
    setOpenToppings(false)
  }, [item.id])

  const active = useMemo(() => {
    if (!variantRow) return item
    return variantRow[size] || variantRow[initialSize] || item
  }, [variantRow, size, initialSize, item])

  const liked = isFavorite(active.id)

  const toppings = useMemo(
    () => (active.toppings || []).filter((t) => t.available !== false),
    [active.toppings],
  )

  const unit = useMemo(() => lineUnitPrice(active, selected), [active, selected])

  const toggleTopping = (topping: Topping) => {
    setSelected((prev) => {
      const exists = prev.some((t) => t.id === topping.id)
      return exists ? prev.filter((t) => t.id !== topping.id) : [...prev, topping]
    })
  }

  const onOrder = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(active, 1, selected)
    launch(e.currentTarget)
    setOpenToppings(false)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1200)
  }

  const onFavorite = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (favBusy) return
    setFavBusy(true)
    try {
      await toggle(active.id)
    } finally {
      setFavBusy(false)
    }
  }

  const onPickSize = (next: PizzaSize) => {
    if (!variantRow?.[next]) return
    setSize(next)
    setSelected([])
    setOpenToppings(false)
  }

  const title = variantRow ? displayPizzaName(active.name) : active.name

  return (
    <article className={`food-card${openToppings ? ' food-card--picking' : ''}`}>
      <div
        className={`food-card__image${variantRow ? ` food-card__image--pizza food-card__image--${size.toLowerCase()}` : ''}`}
      >
        <img src={active.image_url} alt={title} loading="lazy" />
        <button
          type="button"
          className={`food-card__fav${liked ? ' on' : ''}`}
          aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={liked}
          disabled={favBusy}
          onClick={(e) => void onFavorite(e)}
        >
          <Heart size={16} strokeWidth={2.2} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="food-card__details">
        <h3 className="food-card__name">{title}</h3>

        {variantRow ? (
          <div className="food-card__sizes" role="group" aria-label="Pizza size">
            {SIZE_ORDER.map((s) => {
              const available = Boolean(variantRow[s])
              return (
                <button
                  key={s}
                  type="button"
                  className={`food-card__size${size === s ? ' on' : ''}`}
                  disabled={!available}
                  onClick={() => onPickSize(s)}
                >
                  {s === 'S' ? 'S' : s === 'M' ? 'M' : 'L'}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="food-card__meta">
            <span>
              <Star size={11} fill="currentColor" />
              {Number(active.rating || 0).toFixed(1)}
            </span>
            <span>
              <Clock size={11} />
              {active.delivery_mins || '30-40'}
            </span>
          </div>
        )}

        {toppings.length > 0 && (
          <button
            type="button"
            className={`food-card__topping-btn${selected.length ? ' active' : ''}${openToppings ? ' open' : ''}`}
            onClick={() => setOpenToppings((v) => !v)}
          >
            {openToppings ? <X size={12} /> : <Plus size={12} />}
            {selected.length
              ? `${selected.length} topping${selected.length > 1 ? 's' : ''}`
              : 'Add topping'}
          </button>
        )}

        {selected.length > 0 && !openToppings && (
          <p className="food-card__picked">
            {selected.map((t) => toppingLabel(t.name)).join(', ')}
          </p>
        )}

        <div className="food-card__footer">
          <strong className="food-card__price">{formatMoney(unit)}</strong>
          <button
            type="button"
            className={`food-card__order${added ? ' added' : ''}`}
            onClick={onOrder}
          >
            <span>{added ? 'Added' : 'Order'}</span>
          </button>
        </div>
      </div>

      {openToppings && toppings.length > 0 && (
        <div className="food-card__sheet" role="dialog" aria-label="Add toppings">
          <div className="food-card__sheet-head">
            <strong>Add toppings</strong>
            <button type="button" onClick={() => setOpenToppings(false)} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="food-card__sheet-list">
            {toppings.map((topping) => {
              const on = selected.some((t) => t.id === topping.id)
              return (
                <button
                  key={topping.id}
                  type="button"
                  className={`food-card__sheet-item${on ? ' on' : ''}`}
                  onClick={() => toggleTopping(topping)}
                >
                  <span className="food-card__sheet-label">
                    <span className="food-card__sheet-icon" aria-hidden>
                      {toppingIcon(topping.name)}
                    </span>
                    <span className="food-card__sheet-name">{toppingLabel(topping.name)}</span>
                  </span>
                  <em>+{formatMoney(topping.price)}</em>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="food-card__sheet-done"
            onClick={() => setOpenToppings(false)}
          >
            Done · {formatMoney(unit)}
          </button>
        </div>
      )}
    </article>
  )
}
