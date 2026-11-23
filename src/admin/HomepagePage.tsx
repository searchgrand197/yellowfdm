import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { MenuItem } from '../types'

export function HomepagePage() {
  const [rows, setRows] = useState<MenuItem[]>([])

  const load = async () => setRows(await api.admin.listItems())
  useEffect(() => {
    void load()
  }, [])

  const toggle = async (item: MenuItem, field: 'is_featured' | 'is_popular') => {
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
        available: item.available !== false,
        is_featured: field === 'is_featured' ? !item.is_featured : item.is_featured,
        is_popular: field === 'is_popular' ? !item.is_popular : item.is_popular,
        sort_order: item.sort_order ?? 0,
        topping_ids: (item.toppings || []).map((t) => t.id),
      },
      item.id,
    )
    await load()
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Homepage products</h1>
        <p className="muted">Featured drives the promo carousel. Popular feeds the default grid.</p>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Featured</th>
            <th>Popular</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="admin-prod-cell">
                  <img src={row.image_url} alt="" />
                  <strong>{row.name}</strong>
                </div>
              </td>
              <td>
                <button
                  type="button"
                  className={`admin-chip${row.is_featured ? ' on' : ''}`}
                  onClick={() => void toggle(row, 'is_featured')}
                >
                  {row.is_featured ? 'On homepage' : 'Off'}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className={`admin-chip${row.is_popular ? ' on' : ''}`}
                  onClick={() => void toggle(row, 'is_popular')}
                >
                  {row.is_popular ? 'Popular' : 'Off'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
