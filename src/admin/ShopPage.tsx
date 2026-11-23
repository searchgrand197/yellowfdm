import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../api/client'
import type { ShopSettings } from '../types'

type Ctx = { shop: ShopSettings | null; setShop: (s: ShopSettings) => void }

function toTimeInput(value?: string | null) {
  if (!value) return ''
  // Accept HH:MM or HH:MM:SS
  return value.slice(0, 5)
}

export function ShopPage() {
  const { shop, setShop } = useOutletContext<Ctx>()
  const [message, setMessage] = useState(shop?.closed_message || '')
  const [reopensLocal, setReopensLocal] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api.admin.getShop().then((s) => {
      setShop(s)
      setMessage(s.closed_message || '')
      setOpensAt(toTimeInput(s.opens_at))
      setClosesAt(toTimeInput(s.closes_at))
      if (s.reopens_at) {
        const d = new Date(s.reopens_at)
        const pad = (n: number) => String(n).padStart(2, '0')
        setReopensLocal(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
        )
      } else {
        setReopensLocal('')
      }
    })
  }, [setShop])

  const save = async (patch: Partial<ShopSettings>) => {
    setBusy(true)
    try {
      const next = await api.admin.updateShop(patch)
      setShop(next)
      setOpensAt(toTimeInput(next.opens_at))
      setClosesAt(toTimeInput(next.closes_at))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Shop status</h1>
      </div>
      <div className="admin-shop-card">
        <p>
          Status:{' '}
          <strong className={shop?.is_open ? 'ok' : 'bad'}>
            {shop?.is_open ? 'OPEN' : 'CLOSED'}
          </strong>
          {shop?.manual_open === false ? ' (manual close)' : ''}
        </p>
        <p className="muted">
          Daily hours repeat every day. Manual Open / Close overrides for temporary pauses. Closing
          without a reopen time defaults to +50 minutes.
        </p>

        <div className="admin-hours-row">
          <label>
            Opens at (daily)
            <input type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </label>
          <label>
            Closes at (daily)
            <input type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className="admin-btn"
          disabled={busy}
          onClick={() =>
            void save({
              opens_at: opensAt || null,
              closes_at: closesAt || null,
              closed_message: message,
            })
          }
        >
          Save daily hours
        </button>

        <label>
          Closed message
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label>
          Reopens at (manual close)
          <input
            type="datetime-local"
            value={reopensLocal}
            onChange={(e) => setReopensLocal(e.target.value)}
          />
        </label>
        <div className="admin-order-actions">
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={() =>
              void save({
                is_open: true,
                closed_message: message,
                opens_at: opensAt || null,
                closes_at: closesAt || null,
              })
            }
          >
            Open shop
          </button>
          <button
            type="button"
            className="admin-btn ghost"
            disabled={busy}
            onClick={() =>
              void save({
                is_open: false,
                closed_message: message,
                opens_at: opensAt || null,
                closes_at: closesAt || null,
                reopens_at: reopensLocal ? new Date(reopensLocal).toISOString() : null,
              })
            }
          >
            Close shop
          </button>
        </div>
      </div>
    </div>
  )
}
