import { Bell, Menu, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { CategoryScroller } from '../components/CategoryScroller'
import { buildCombos, ComboCarousel, PromoCarousel } from '../components/ComboCarousel'
import { FoodCard } from '../components/FoodCard'
import type { Category, MenuItem } from '../types'
import { onlyCutouts } from '../utils/images'

export function DiscoverPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [featured, setFeatured] = useState<MenuItem[]>([])
  const [popular, setPopular] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [cats, featuredItems, popularItems, allItems] = await Promise.all([
          api.getCategories(),
          api.getItems({ featured: '1' }),
          api.getItems({ popular: '1' }),
          api.getItems(),
        ])
        const cutoutAll = onlyCutouts(allItems.length ? allItems : popularItems)
        const cutoutFeatured = onlyCutouts(
          featuredItems.length ? featuredItems : popularItems,
        )
        setCategories(cats)
        setFeatured(cutoutFeatured.slice(0, 5))
        setPopular(cutoutAll)
        if (cats.length) {
          setActiveCategory((prev) =>
            prev && cats.some((c) => c.slug === prev) ? prev : cats[0].slug,
          )
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!activeCategory) return
    void (async () => {
      const data = await api.getItems({ category: activeCategory })
      const fallback = data.length ? data : await api.getItems({ popular: '1' })
      setItems(onlyCutouts(fallback))
    })()
  }, [activeCategory])

  const combos = useMemo(() => buildCombos(onlyCutouts(popular)), [popular])

  return (
    <div className="page discover-page">
      <header className="page-header">
        <button type="button" className="icon-btn" aria-label="Menu">
          <Menu size={22} />
        </button>
        <div className="header-actions">
          <Link to="/search" className="icon-btn" aria-label="Search">
            <Search size={20} />
          </Link>
          <button type="button" className="icon-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
        </div>
      </header>

      <h1 className="page-title">Discover</h1>

      <PromoCarousel items={featured.slice(0, 5)} />

      <div className="section-head">
        <h2>Combo deals</h2>
        <Link to={activeCategory ? `/search?category=${activeCategory}` : '/search'}>
          See all
        </Link>
      </div>
      <ComboCarousel combos={combos} />

      <CategoryScroller
        categories={categories}
        active={activeCategory}
        onSelect={(slug) => {
          setActiveCategory(slug)
          navigate(`/search?category=${slug}`)
        }}
      />

      <div className="section-head">
        <h2>Popular Items</h2>
        <Link to={activeCategory ? `/search?category=${activeCategory}` : '/search'}>
          See all
        </Link>
      </div>

      {loading ? (
        <p className="muted">Loading menu…</p>
      ) : (
        <div className="food-grid">
          {items.map((item) => (
            <FoodCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
