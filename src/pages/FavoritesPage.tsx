import { Heart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { FoodCard } from '../components/FoodCard'
import { useFavorites } from '../context/FavoritesContext'
import type { MenuItem } from '../types'
import { onlyCutouts } from '../utils/images'
import { buildPizzaVariantMap } from '../utils/pizzaSizes'

export function FavoritesPage() {
  const { count, ids } = useFavorites()
  const [items, setItems] = useState<MenuItem[]>([])
  const [catalog, setCatalog] = useState<MenuItem[]>([])
  const pizzaVariants = useMemo(() => buildPizzaVariantMap(catalog), [catalog])

  useEffect(() => {
    if (ids.size === 0) {
      setItems([])
      return
    }
    let cancelled = false
    void api
      .getItems()
      .then((data) => {
        if (cancelled) return
        setCatalog(data)
        setItems(onlyCutouts(data).filter((item) => ids.has(item.id)))
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [ids])

  return (
    <div className="page">
      <h1 className="page-title">Favorites</h1>
      {items.length === 0 ? (
        <div className="fav-empty">
          <div className="fav-empty__heart" aria-hidden>
            <Heart className="nav-heart__icon" size={36} strokeWidth={1.8} />
            <span className="fav-empty__count">{count}</span>
          </div>
          <h2>No favorites yet</h2>
          <p>Save dishes you love — your count stays here.</p>
          <Link to="/search?view=all" className="btn btn-yellow">
            Discover food
          </Link>
        </div>
      ) : (
        <div className="food-grid">
          {items.map((item, index) => (
            <FoodCard key={item.id} item={item} index={index} pizzaVariants={pizzaVariants} />
          ))}
        </div>
      )}
    </div>
  )
}
