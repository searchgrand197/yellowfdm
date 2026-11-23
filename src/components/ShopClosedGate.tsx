import { useEffect, useMemo, useState } from 'react'
import { useShop } from '../context/ShopContext'

function formatRemain(ms: number) {
  if (ms <= 0) return { m: '00', s: '00', label: '00:00' }
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return { m: mm, s: ss, label: `${mm}:${ss}` }
}

function formatClock(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function ShopClosedGate({ children }: { children: React.ReactNode }) {
  const { shop, loading, refresh } = useShop()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!shop || shop.is_open || !shop.reopens_at) return
    const reopen = new Date(shop.reopens_at).getTime()
    if (reopen <= Date.now()) {
      void refresh()
    }
  }, [now, shop, refresh])

  const reopenMs = useMemo(() => {
    if (!shop?.reopens_at) return 0
    return new Date(shop.reopens_at).getTime() - now
  }, [shop?.reopens_at, now])

  if (loading) return <>{children}</>
  if (!shop || shop.is_open) return <>{children}</>

  const time = formatRemain(reopenMs)
  const opensAt = formatClock(shop.reopens_at)
  const message = shop.closed_message?.trim()

  return (
    <div className="app-shell shop-closed-shell">
      <div className="app-frame shop-closed-frame">
        <div className="kitchen-closed" role="status" aria-live="polite">
          <p className="kitchen-closed__brand">Foodporium</p>

          <div className="kitchen-closed__hang">
            <svg
              className="kitchen-closed__hanger"
              viewBox="0 0 240 70"
              aria-hidden
            >
              <circle cx="120" cy="12" r="8" fill="none" stroke="#fff" strokeWidth="3.5" />
              <path
                d="M120 20 L42 68 M120 20 L198 68"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="kitchen-closed__sign">
              <span className="kitchen-closed__sign-hatch" aria-hidden />
              <p className="kitchen-closed__sign-text">
                Kitchen
                <br />
                Closed
              </p>
            </div>
          </div>

          {shop.reopens_at ? (
            <div className="kitchen-closed__timer" aria-label={`Opens in ${time.label}`}>
              <span className="kitchen-closed__timer-label">Opens in</span>
              <div className="kitchen-closed__digits">
                <span>{time.m}</span>
                <i aria-hidden>:</i>
                <span>{time.s}</span>
              </div>
              {opensAt ? <span className="kitchen-closed__back">Back at {opensAt}</span> : null}
            </div>
          ) : null}

          {message ? <p className="kitchen-closed__note">{message}</p> : null}

          <p className="kitchen-closed__sorry">Sorry for any inconvenience!</p>
        </div>
      </div>
    </div>
  )
}
