import { Clock, Heart, Plus, Star, X } from 'lucide-react'
import { useMemo, useState, type MouseEvent } from 'react'
import { useCartMagic } from '../context/CartMagicContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { lineUnitPrice, type MenuItem, type Topping } from '../types'
import { formatMoney } from '../utils/money'

export function FoodCard({ item }: { item: MenuItem; index?: number }) {
  const { addItem } = useCart()
  const { launch } = useCartMagic()
  const { isFavorite, toggle } = useFavorites()
  const [added, setAdded] = useState(false)
  const [openToppings, setOpenToppings] = useState(false)
  const [selected, setSelected] = useState<Topping[]>([])
  const [favBusy, setFavBusy] = useState(false)
  const liked = isFavorite(item.id)

  const toppings = useMemo(
    () => (item.toppings || []).filter((t) => t.available !== false),
    [item.toppings],
  )

  const unit = useMemo(() => lineUnitPrice(item, selected), [item, selected])

  const toggleTopping = (topping: Topping) => {
    setSelected((prev) => {
      const exists = prev.some((t) => t.id === topping.id)
      return exists ? prev.filter((t) => t.id !== topping.id) : [...prev, topping]
    })
  }

  const onOrder = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(item, 1, selected)
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
      await toggle(item.id)
    } finally {
      setFavBusy(false)
    }
  }

  return (
    <article className={`food-card${openToppings ? ' food-card--picking' : ''}`}>
      <div className="food-card__image">
        <img src={item.image_url} alt={item.name} loading="lazy" />
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
        <h3 className="food-card__name">{item.name}</h3>

        <div className="food-card__meta">
          <span>
            <Star size={11} fill="currentColor" />
            {Number(item.rating || 0).toFixed(1)}
          </span>
          <span>
            <Clock size={11} />
            {item.delivery_mins || '30-40'}
          </span>
        </div>

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
            {selected.map((t) => t.name).join(', ')}
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
                  <span>{topping.name}</span>
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
