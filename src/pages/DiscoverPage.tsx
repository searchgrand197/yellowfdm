import { Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { CategoryScroller } from '../components/CategoryScroller'
import { ComboCarousel, PromoCarousel, type ComboDeal } from '../components/ComboCarousel'
import { FoodCard } from '../components/FoodCard'
import { FoodporiumBrand } from '../components/FoodporiumBrand'
import { OffersCarousel } from '../components/OffersCarousel'
import { FoodporiumPromise } from '../components/FoodporiumPromise'
import { PaymentAccept } from '../components/PaymentAccept'
import { useWallet } from '../context/WalletContext'
import type { Category, Coupon, MenuItem } from '../types'
import { onlyCutouts } from '../utils/images'
import { formatMoney } from '../utils/money'
import { buildPizzaVariantMap, dedupePizzaItems, pizzaBaseKey } from '../utils/pizzaSizes'

export function DiscoverPage() {
  const navigate = useNavigate()
  const { balance } = useWallet()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [featured, setFeatured] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [combos, setCombos] = useState<ComboDeal[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [catalog, setCatalog] = useState<MenuItem[]>([])

  const pizzaVariants = useMemo(() => buildPizzaVariantMap(catalog), [catalog])
  const gridItems = useMemo(
    () => dedupePizzaItems(items, pizzaVariants),
    [items, pizzaVariants],
  )

  useEffect(() => {
    void (async () => {
      try {
        const [cats, featuredItems, popularItems, allItems, apiCombos, apiCoupons] =
          await Promise.all([
          api.getCategories(),
          api.getItems({ featured: '1' }),
          api.getItems({ popular: '1' }),
          api.getItems(),
          api.getCombos().catch(() => []),
          api.getCoupons().catch(() => []),
        ])
        setCoupons(apiCoupons)
        setCatalog(allItems.length ? allItems : popularItems)
        const cutoutAll = onlyCutouts(allItems.length ? allItems : popularItems)
        const cutoutFeatured = onlyCutouts(
          featuredItems.length ? featuredItems : popularItems,
        )
        setCategories(cats)
        setFeatured(cutoutFeatured.slice(0, 5))
        const byId = new Map(
          [...cutoutAll, ...cutoutFeatured, ...popularItems, ...allItems].map((i) => [i.id, i]),
        )
        const stubItem = (
          id: number,
          name: string,
          image: string,
          priceShare: number,
        ): MenuItem => ({
          id,
          name,
          subtitle: '',
          description: '',
          price: String(priceShare),
          original_price: null,
          image_url: image,
          delivery_mins: '20',
          free_delivery: false,
          rating: '0',
          review_count: 0,
          is_popular: false,
          is_featured: false,
          promo_label: '',
          category: 0,
          category_name: '',
          category_slug: '',
          is_favorite: false,
          toppings: [],
        })

        const fromApi: ComboDeal[] = []
        apiCombos.forEach((c, idx) => {
          const ids = c.item_ids?.length
            ? c.item_ids
            : [c.item_a, c.item_b, c.item_c, c.item_d].filter((id): id is number => Boolean(id))
          const names = c.item_names?.length
            ? c.item_names
            : [c.item_a_name, c.item_b_name, c.item_c_name, c.item_d_name].filter(
                (n): n is string => Boolean(n),
              )
          const images = [
            c.item_a_image,
            c.item_b_image,
            c.item_c_image,
            c.item_d_image,
          ].filter((img): img is string => Boolean(img))
          const share = Number(c.actual_price || c.price) / Math.max(ids.length, 1)
          const parts = ids
            .map((id, i) => {
              const found = byId.get(id)
              if (found) return found
              if (!names[i] || !images[i]) return null
              return stubItem(id, names[i], images[i], share)
            })
            .filter((i): i is MenuItem => Boolean(i))
          if (parts.length < 2) return
          const photo = (c.image_url || '').trim()
          fromApi.push({
            id: `combo-${c.id}`,
            title: c.name,
            badge: c.badge || 'Combo',
            tagline: `Save ₹${c.save_amount}`,
            items: parts,
            imageUrl: photo || undefined,
            primary: parts[0],
            side: parts[1],
            saveAmount: Number(c.save_amount),
            comboPrice: Number(c.price),
            accent: idx % 3,
          })
        })
        setCombos(fromApi)
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

  return (
    <div className="page discover-page">
      <header className="page-header">
        <FoodporiumBrand />
        <Link to="/profile" className="header-wallet" aria-label={`Wallet balance ${formatMoney(balance)}`}>
          <Wallet size={16} strokeWidth={2.3} />
          <span>{formatMoney(balance)}</span>
        </Link>
      </header>

      <h1 className="page-title">Discover</h1>

      <PromoCarousel items={featured.slice(0, 5)} />

      <OffersCarousel coupons={coupons} />

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
          {gridItems.map((item) => (
            <FoodCard
              key={pizzaBaseKey(item.name) || item.id}
              item={item}
              pizzaVariants={pizzaVariants}
            />
          ))}
        </div>
      )}

      <FoodporiumPromise />
      <PaymentAccept />
    </div>
  )
}
