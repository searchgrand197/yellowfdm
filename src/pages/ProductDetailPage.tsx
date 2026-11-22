import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Minus, Plus, Star } from 'lucide-react'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useCartMagic } from '../context/CartMagicContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import type { MenuItem, Topping } from '../types'
import { lineUnitPrice } from '../types'
import { formatMoney, formatReviewCount } from '../utils/money'

export function ProductDetailPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { launch } = useCartMagic()
  const { isFavorite, toggle } = useFavorites()
  const [item, setItem] = useState<MenuItem | null>(null)
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<Topping[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!id) return
    void api.getItem(id).then((data) => {
      setItem({ ...data, toppings: data.toppings || [] })
      setSelected([])
      setQty(1)
    })
  }, [id])

  const unit = useMemo(
    () => (item ? lineUnitPrice(item, selected) : 0),
    [item, selected],
  )

  if (!item) {
    return (
      <div className="page">
        <p className="muted">Loading dish…</p>
      </div>
    )
  }

  const favorited = isFavorite(item.id)

  const toggleFavorite = async () => {
    await toggle(item.id)
  }

  const toggleTopping = (topping: Topping) => {
    setSelected((prev) => {
      const exists = prev.some((t) => t.id === topping.id)
      return exists ? prev.filter((t) => t.id !== topping.id) : [...prev, topping]
    })
  }

  const handleAdd = (e: MouseEvent<HTMLButtonElement>) => {
    addItem(item, qty, selected)
    launch(e.currentTarget)
    setToast('Added to cart')
    window.setTimeout(() => setToast(''), 1600)
  }

  return (
    <div className="page detail-page">
      <div className="detail-hero">
        <div className="detail-top-actions">
          <Link to="/" className="icon-btn light" aria-label="Back">
            <ArrowLeft size={20} />
          </Link>
          <button
            type="button"
            className={`icon-btn light${favorited ? ' liked' : ''}`}
            aria-label="Favorite"
            onClick={() => void toggleFavorite()}
          >
            <Heart size={20} fill={favorited ? 'currentColor' : 'none'} />
          </button>
        </div>
        <motion.img
          src={item.image_url}
          alt={item.name}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45 }}
        />
      </div>

      <div className="detail-sheet">
        <div className="detail-title-row">
          <div>
            <h1>{item.name}</h1>
            <p className="muted">{item.subtitle || item.category_name}</p>
          </div>
          <div className="detail-price">
            <strong>{formatMoney(unit)}</strong>
            {item.original_price && selected.length === 0 && (
              <s>{formatMoney(item.original_price)}</s>
            )}
          </div>
        </div>

        <div className="detail-stats">
          <div>
            <strong>{item.delivery_mins} min</strong>
            <span>Delivery</span>
          </div>
          <div>
            <strong>{formatReviewCount(item.review_count)}</strong>
            <span>Reviews</span>
          </div>
          <div>
            <strong>
              <Star size={14} fill="currentColor" /> {Number(item.rating).toFixed(1)}
            </strong>
            <span>Rating</span>
          </div>
        </div>

        <h2 className="detail-section-title">Description</h2>
        <p className="detail-desc">{item.description}</p>

        {item.toppings.length > 0 && (
          <div className="toppings-block">
            <h2 className="detail-section-title">Add toppings</h2>
            <div className="topping-list">
              {item.toppings
                .filter((t) => t.available)
                .map((topping) => {
                  const active = selected.some((t) => t.id === topping.id)
                  return (
                    <button
                      key={topping.id}
                      type="button"
                      className={`topping-chip${active ? ' active' : ''}`}
                      onClick={() => toggleTopping(topping)}
                    >
                      <span>{topping.name}</span>
                      <strong>+{formatMoney(topping.price)}</strong>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        <div className="detail-actions">
          <div className="qty-control">
            <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus size={16} />
            </button>
            <span>{qty}</span>
            <button type="button" aria-label="Increase" onClick={() => setQty((q) => q + 1)}>
              <Plus size={16} />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-yellow grow"
            onClick={(e) => handleAdd(e)}
          >
            Add to Cart · {formatMoney(unit * qty)}
          </button>
        </div>
        {toast && <p className="toast">{toast}</p>}
      </div>
    </div>
  )
}
