import { GripVertical, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Category, MenuItem, Topping } from '../types'
import { formatMoney } from '../utils/money'
import { AdminCheck, AdminCheckGroup, AdminField } from './AdminField'
import { AdminImageField } from './AdminImageField'
import { AdminModal } from './AdminModal'
import { useReorder } from './useReorder'

function hasOffer(item: MenuItem) {
  return Boolean(item.promo_label?.trim()) || Boolean(item.original_price)
}

const blank = {
  name: '',
  subtitle: '',
  description: '',
  price: '0',
  original_price: '',
  image_url: '',
  category: 0,
  promo_label: '',
  available: true,
  is_featured: false,
  is_popular: false,
  topping_ids: [] as number[],
}

export function ProductsPage() {
  const [rows, setRows] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [toppings, setToppings] = useState<Topping[]>([])
  const [form, setForm] = useState(blank)
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all')
  const [offerFilter, setOfferFilter] = useState<'all' | 'offer' | 'none'>('all')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = async () => {
    const [items, cats, tops] = await Promise.all([
      api.admin.listItems(),
      api.admin.listCategories(),
      api.admin.listToppings(),
    ])
    setRows(items)
    setCategories(cats)
    setToppings(tops)
  }

  useEffect(() => {
    void load().catch((e) => setError(String(e.message || e)))
  }, [])

  const filtersActive =
    stockFilter !== 'all' || offerFilter !== 'all' || categoryFilter !== 'all'

  const visible = useMemo(() => {
    return rows.filter((row) => {
      const inStock = row.available !== false
      if (stockFilter === 'in' && !inStock) return false
      if (stockFilter === 'out' && inStock) return false
      if (offerFilter === 'offer' && !hasOffer(row)) return false
      if (offerFilter === 'none' && hasOffer(row)) return false
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false
      return true
    })
  }, [rows, stockFilter, offerFilter, categoryFilter])

  const { dragging, onDragStart, onDragOver, onDragEnd } = useReorder(rows, setRows, (ids) =>
    api.admin.reorderItems(ids),
  )

  const closeModal = () => {
    setOpen(false)
    setEditId(null)
    setForm({ ...blank, category: categories[0]?.id || 0 })
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ ...blank, category: categories[0]?.id || 0 })
    setOpen(true)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await api.admin.saveItem(
      {
        name: form.name,
        subtitle: form.subtitle,
        description: form.description,
        price: form.price,
        original_price: form.original_price || null,
        image_url: form.image_url,
        category: form.category,
        promo_label: form.promo_label,
        available: form.available,
        is_featured: form.is_featured,
        is_popular: form.is_popular,
        topping_ids: form.topping_ids,
        sort_order: editId
          ? rows.find((r) => r.id === editId)?.sort_order ?? rows.length
          : rows.length,
      },
      editId || undefined,
    )
    closeModal()
    await load()
  }

  const toggleStock = async (item: MenuItem) => {
    const next = !(item.available !== false)
    setTogglingId(item.id)
    setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, available: next } : r)))
    try {
      await api.admin.saveItem(
        {
          name: item.name,
          subtitle: item.subtitle,
          description: item.description,
          price: item.price,
          original_price: item.original_price,
          image_url: item.image_url,
          category: item.category,
          promo_label: item.promo_label,
          available: next,
          is_featured: item.is_featured,
          is_popular: item.is_popular,
          topping_ids: (item.toppings || []).map((t) => t.id),
          sort_order: item.sort_order ?? 0,
        },
        item.id,
      )
    } catch (e) {
      setRows((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, available: item.available } : r)),
      )
      setError(e instanceof Error ? e.message : 'Could not update stock')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Products</h1>
        <button type="button" className="admin-btn" onClick={openCreate}>
          <Plus size={16} /> Add product
        </button>
      </div>
      {error && <p className="admin-error">{error}</p>}

      <div className="admin-toolbar">
        <div className="admin-toolbar__filters">
          <label className="admin-toolbar__field">
            <span>Stock</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'all' | 'in' | 'out')}
            >
              <option value="all">All</option>
              <option value="in">In stock</option>
              <option value="out">Out of stock</option>
            </select>
          </label>
          <label className="admin-toolbar__field">
            <span>Offer</span>
            <select
              value={offerFilter}
              onChange={(e) => setOfferFilter(e.target.value as 'all' | 'offer' | 'none')}
            >
              <option value="all">All</option>
              <option value="offer">On offer</option>
              <option value="none">No offer</option>
            </select>
          </label>
          <label className="admin-toolbar__field">
            <span>Category</span>
            <select
              value={categoryFilter === 'all' ? 'all' : String(categoryFilter)}
              onChange={(e) => {
                const v = e.target.value
                setCategoryFilter(v === 'all' ? 'all' : Number(v))
              }}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-toolbar__meta">
          <span>
            {visible.length} of {rows.length}
          </span>
          {filtersActive ? (
            <button
              type="button"
              className="admin-btn ghost admin-toolbar__clear"
              onClick={() => {
                setStockFilter('all')
                setOfferFilter('all')
                setCategoryFilter('all')
              }}
            >
              Clear filters
            </button>
          ) : (
            <span className="admin-toolbar__hint">Drag to reorder · toggle stock in list</span>
          )}
        </div>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th className="admin-drag-col" />
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Offer</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            const inStock = row.available !== false
            const offer = hasOffer(row)
            return (
              <tr
                key={row.id}
                className={dragging === row.id ? 'is-dragging' : ''}
                draggable={!filtersActive}
                onDragStart={() => {
                  if (!filtersActive) onDragStart(row.id)
                }}
                onDragOver={(e) => {
                  if (!filtersActive) onDragOver(e, row.id)
                }}
                onDragEnd={() => {
                  if (!filtersActive) void onDragEnd()
                }}
              >
                <td className="admin-drag-col">
                  <GripVertical size={16} />
                </td>
                <td>
                  <div className="admin-prod-cell">
                    <img src={row.image_url} alt="" />
                    <div>
                      <strong>{row.name}</strong>
                      <span>{row.category_name}</span>
                    </div>
                  </div>
                </td>
                <td>
                  {formatMoney(Number(row.price))}
                  {row.original_price ? (
                    <span className="admin-price-was">{formatMoney(Number(row.original_price))}</span>
                  ) : null}
                </td>
                <td>
                  <button
                    type="button"
                    className={`admin-toggle${inStock ? ' is-on' : ''}`}
                    aria-pressed={inStock}
                    disabled={togglingId === row.id}
                    onClick={() => void toggleStock(row)}
                    title={inStock ? 'In stock — click to stock out' : 'Out of stock — click to enable'}
                  >
                    <span className="admin-toggle__track">
                      <span className="admin-toggle__knob" />
                    </span>
                    <span className="admin-toggle__text">{inStock ? 'In stock' : 'Out'}</span>
                  </button>
                </td>
                <td>
                  {offer ? (
                    <span className="admin-offer-pill">
                      {row.promo_label || 'Offer'}
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="admin-row-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(row.id)
                      setForm({
                        name: row.name,
                        subtitle: row.subtitle,
                        description: row.description,
                        price: String(row.price),
                        original_price: row.original_price ? String(row.original_price) : '',
                        image_url: row.image_url,
                        category: row.category,
                        promo_label: row.promo_label || '',
                        available: row.available !== false,
                        is_featured: row.is_featured,
                        is_popular: row.is_popular,
                        topping_ids: (row.toppings || []).map((t) => t.id),
                      })
                      setOpen(true)
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => void api.admin.deleteItem(row.id).then(load)}>
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!visible.length ? <p className="muted">No products match these filters.</p> : null}

      <AdminModal open={open} title={editId ? 'Edit product' : 'Add product'} onClose={closeModal}>
        <form className="admin-form admin-form--modal admin-form--grid" onSubmit={(e) => void onSubmit(e)}>
          <AdminField label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </AdminField>
          <AdminField label="Subtitle">
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </AdminField>
          <AdminField label="Price (₹)">
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </AdminField>
          <AdminField label="Original price (₹)" hint="Optional strike-through offer price">
            <input
              value={form.original_price}
              onChange={(e) => setForm({ ...form, original_price: e.target.value })}
            />
          </AdminField>
          <AdminField label="Promo label">
            <input
              value={form.promo_label}
              onChange={(e) => setForm({ ...form, promo_label: e.target.value })}
              placeholder="e.g. 20% off"
            />
          </AdminField>
          <AdminField label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminImageField
            value={form.image_url}
            onChange={(image_url) => setForm({ ...form, image_url })}
            required
            variant="product"
          />
          <AdminField label="Description" full>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </AdminField>
          <AdminCheckGroup label="Visibility">
            <AdminCheck
              label="In stock"
              checked={form.available}
              onChange={(available) => setForm({ ...form, available })}
            />
            <AdminCheck
              label="Featured"
              checked={form.is_featured}
              onChange={(is_featured) => setForm({ ...form, is_featured })}
            />
            <AdminCheck
              label="Popular"
              checked={form.is_popular}
              onChange={(is_popular) => setForm({ ...form, is_popular })}
            />
          </AdminCheckGroup>
          <AdminCheckGroup label="Toppings">
            {toppings.length ? (
              toppings.map((t) => (
                <AdminCheck
                  key={t.id}
                  label={`${t.name} · ₹${t.price}`}
                  checked={form.topping_ids.includes(t.id)}
                  onChange={(on) =>
                    setForm({
                      ...form,
                      topping_ids: on
                        ? [...form.topping_ids, t.id]
                        : form.topping_ids.filter((id) => id !== t.id),
                    })
                  }
                />
              ))
            ) : (
              <p className="muted">No toppings yet.</p>
            )}
          </AdminCheckGroup>
          <button type="submit" className="admin-btn">
            {editId ? 'Save changes' : 'Add product'}
          </button>
        </form>
      </AdminModal>
    </div>
  )
}
