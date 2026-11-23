import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Order } from '../types'
import { formatMoney } from '../utils/money'
import { useOrderBuzz } from './useOrderBuzz'

const FLOW = ['pending', 'confirmed', 'preparing', 'delivered'] as const

function nextStatus(current: string) {
  const i = FLOW.indexOf(current as (typeof FLOW)[number])
  if (i < 0 || i >= FLOW.length - 1) return null
  return FLOW[i + 1]
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('')
  const [flash, setFlash] = useState<number[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const params: Record<string, string> = {}
    if (filter) params.status = filter
    const data = await api.admin.listOrders(params)
    setOrders(data)
  }, [filter])

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [load])

  useOrderBuzz(true, (ids) => {
    setFlash(ids)
    void load()
  })

  const updateStatus = async (id: number, status: string) => {
    await api.admin.updateOrderStatus(id, status)
    await load()
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Orders</h1>
        <div className="admin-filters">
          {['', 'pending', 'confirmed', 'preparing', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              className={`admin-chip${filter === s ? ' on' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-order-grid">
        {orders.map((order) => {
          const nxt = nextStatus(order.status)
          return (
            <article
              key={order.id}
              className={`admin-order-card${flash.includes(order.id) ? ' flash' : ''}`}
            >
              <header>
                <strong>#{order.id}</strong>
                <span className={`admin-status ${order.status}`}>{order.status}</span>
              </header>
              <p>
                {order.guest_name || 'Guest'} · {order.guest_phone}
              </p>
              <p className="muted">{order.address}</p>
              <ul>
                {order.items.map((line) => (
                  <li key={line.id}>
                    {line.quantity}× {line.name}
                    {line.toppings_text ? ` (${line.toppings_text})` : ''}
                  </li>
                ))}
              </ul>
              <div className="admin-order-card__foot">
                <strong>{formatMoney(Number(order.total))}</strong>
                <span>{order.payment_status || 'pending'}</span>
              </div>
              <div className="admin-order-actions">
                {nxt && (
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => void updateStatus(order.id, nxt)}
                  >
                    {nxt === 'delivered' ? 'Mark complete' : `Mark ${nxt}`}
                  </button>
                )}
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={() => void updateStatus(order.id, 'cancelled')}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </article>
          )
        })}
        {!orders.length && <p className="muted">No orders yet.</p>}
      </div>
    </div>
  )
}
