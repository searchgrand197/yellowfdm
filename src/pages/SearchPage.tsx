import { Search } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { CategoryScroller } from '../components/CategoryScroller'
import { FoodCard } from '../components/FoodCard'
import type { Category, MenuItem } from '../types'
import { onlyCutouts } from '../utils/images'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || ''
  const viewAll = searchParams.get('view') === 'all'
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState(viewAll ? '' : categoryParam)
  const [items, setItems] = useState<MenuItem[]>([])

  useEffect(() => {
    void api.getCategories().then((cats) => {
      setCategories(cats)
      if (viewAll) {
        setActiveCategory('')
        return
      }
      if (!cats.length) return
      const match = categoryParam && cats.some((c) => c.slug === categoryParam)
      setActiveCategory(match ? categoryParam : cats[0].slug)
      if (match) setQuery('')
    })
  }, [categoryParam, viewAll])

  useEffect(() => {
    void (async () => {
      if (deferred.trim()) {
        setItems(onlyCutouts(await api.getItems({ search: deferred.trim() })))
        return
      }
      if (viewAll || !activeCategory) {
        setItems(onlyCutouts(await api.getItems()))
        return
      }
      const data = await api.getItems({ category: activeCategory })
      const list = data.length ? data : await api.getItems({ popular: '1' })
      setItems(onlyCutouts(list))
    })()
  }, [deferred, activeCategory, viewAll])

  const selectCategory = (slug: string) => {
    setQuery('')
    setActiveCategory(slug)
    setSearchParams({ category: slug })
  }

  return (
    <div className="page search-page">
      <h1 className="page-title">{viewAll ? 'All products' : 'Search'}</h1>
      <label className="search-field">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Burgers, pizza, fries…"
          inputMode="search"
          enterKeyHint="search"
        />
      </label>

      <CategoryScroller
        categories={categories}
        active={deferred.trim() || viewAll ? '' : activeCategory}
        onSelect={selectCategory}
      />

      <div className="section-head">
        <h2>
          {deferred.trim()
            ? 'Results'
            : viewAll
              ? 'Menu'
              : categories.find((c) => c.slug === activeCategory)?.name || 'Popular'}
        </h2>
      </div>

      <div className="food-grid">
        {items.map((item) => (
          <FoodCard key={item.id} item={item} />
        ))}
      </div>
      {!items.length && (
        <p className="muted">
          {deferred.trim() ? `No matches for “${deferred}”.` : 'No items in this category.'}
        </p>
      )}
    </div>
  )
}
