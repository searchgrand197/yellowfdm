import { ArrowLeft, ChevronDown, Minus, Plus, Ticket, Wallet, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { CouponConfetti } from '../components/CouponConfetti'
import { useCart } from '../context/CartContext'
import { useWallet } from '../context/WalletContext'
import { openRazorpayCheckout } from '../lib/razorpay'
import type { Coupon } from '../types'
import { lineUnitPrice } from '../types'
import { formatMoney } from '../utils/money'

function padQty(n: number) {
  return String(n).padStart(2, '0')
}

export function CartPage() {
  const { lines, total: subtotal, setQuantity, removeItem, clear } = useCart()
  const { balance, couponCode, scratched, setPhone, refresh } = useWallet()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(0)
  const [couponCleared, setCouponCleared] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)
  const [removingKeys, setRemovingKeys] = useState<string[]>([])
  const [useWalletPay, setUseWalletPay] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [doneId, setDoneId] = useState<number | null>(null)
  const [confettiBurst, setConfettiBurst] = useState(0)
  const [serverCoupons, setServerCoupons] = useState<Coupon[]>([])
  const couponMenuRef = useRef<HTMLDivElement>(null)
  const confettiOnceRef = useRef(false)

  const celebrateCoupon = () => {
    setConfettiBurst((n) => n + 1)
  }

  useEffect(() => {
    void api.getCoupons().then(setServerCoupons).catch(() => setServerCoupons([]))
  }, [])

  const couponOptions = useMemo(() => {
    const fromApi = serverCoupons.map((c) => {
      const minOrder = Number(c.min_order_value || 0)
      const eligible = subtotal >= minOrder
      const bits = [`${c.code} · ₹${c.amount} off`]
      if (minOrder) bits.push(`min ₹${minOrder}`)
      if (c.one_time) bits.push('one time')
      return {
        code: c.code,
        amount: Number(c.amount),
        minOrder,
        oneTime: Boolean(c.one_time),
        eligible,
        label: bits.join(' · '),
      }
    })
    if (scratched && couponCode && !fromApi.some((c) => c.code.toUpperCase() === couponCode.toUpperCase())) {
      fromApi.unshift({
        code: couponCode,
        amount: 10,
        minOrder: 0,
        oneTime: true,
        eligible: true,
        label: `${couponCode} · ₹10 off · one time`,
      })
    }
    return fromApi
  }, [serverCoupons, scratched, couponCode, subtotal])

  useEffect(() => {
    // Auto-apply once; do not re-apply after the user removes the coupon.
    const eligible = couponOptions.filter((c) => c.eligible)
    if (!eligible.length || promoApplied || couponCleared) return
    const first = eligible[0]
    setPromoInput(first.code)
    setPromoApplied(first.amount)
    if (!confettiOnceRef.current) {
      confettiOnceRef.current = true
      celebrateCoupon()
    }
  }, [couponOptions, promoApplied, couponCleared])

  useEffect(() => {
    if (!promoInput || !promoApplied) return
    const match = couponOptions.find((c) => c.code.toUpperCase() === promoInput.toUpperCase())
    if (match && !match.eligible) {
      setPromoApplied(0)
      setPromoInput('')
    }
  }, [couponOptions, promoInput, promoApplied])

  useEffect(() => {
    if (!couponOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!couponMenuRef.current?.contains(e.target as Node)) setCouponOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCouponOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [couponOpen])

  const discount = promoApplied
  const payable = Math.max(0, Math.round(subtotal - discount))
  const walletSpend = useWalletPay ? Math.min(balance, payable) : 0
  const razorpayDue = Math.max(0, payable - walletSpend)

  const clearCoupon = () => {
    setCouponCleared(true)
    confettiOnceRef.current = false
    setPromoInput('')
    setPromoApplied(0)
  }

  const onSelectCoupon = (value: string) => {
    setPromoInput(value)
    if (!value) {
      clearCoupon()
      return
    }
    setCouponCleared(false)
    const match = couponOptions.find((c) => c.code.toUpperCase() === value.trim().toUpperCase())
    if (!match?.eligible) {
      setPromoApplied(0)
      setError(
        match?.minOrder
          ? `Add items worth ₹${match.minOrder} to use ${match.code}`
          : 'Coupon not available',
      )
      return
    }
    const amount = match.amount
    if (!amount) {
      setPromoApplied(0)
      return
    }
    setError('')
    const freshlyApplied = promoApplied !== amount || promoInput !== value
    setPromoApplied(amount)
    if (freshlyApplied) celebrateCoupon()
  }

  const removeLine = (key: string) => {
    if (removingKeys.includes(key)) return
    setRemovingKeys((prev) => [...prev, key])
    window.setTimeout(() => {
      removeItem(key)
      setRemovingKeys((prev) => prev.filter((k) => k !== key))
    }, 320)
  }

  const onCheckout = async (e: FormEvent) => {
    e.preventDefault()
    if (!lines.length) return
    if (!name.trim() || !phoneInput.trim()) {
      setError('Please enter name and phone')
      return
    }

    setSubmitting(true)
    setError('')
    const phone = phoneInput.replace(/\D/g, '').slice(-10)
    setPhone(phone)

    try {
      await refresh(phone)

      const order = await api.placeOrder({
        guest_name: name.trim(),
        guest_phone: phone,
        address: 'Dine-in',
        coupon_code: promoInput || undefined,
        notes: [
          discount ? `Coupon discount: ₹${discount}` : '',
          walletSpend ? `Wallet used: ₹${walletSpend}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        cart_items: lines.map((line) => ({
          menu_item_id: line.item.id,
          quantity: line.quantity,
          topping_ids: line.toppings.map((t) => t.id),
        })),
      })

      if (walletSpend > 0) {
        await api.payWithWallet(order.id, phone, walletSpend)
        await refresh()
      }

      if (razorpayDue <= 0) {
        clear()
        setDoneId(order.id)
        return
      }

      const payment = await api.initiatePayment(razorpayDue, order.id)

      await new Promise<void>((resolve, reject) => {
        void openRazorpayCheckout({
          key: payment.key,
          amount: payment.amount,
          currency: payment.currency,
          name: 'Foodporium',
          description: `Order #${order.id}`,
          order_id: payment.id,
          prefill: { name, contact: phone },
          theme: { color: '#ffcc33' },
          handler: (response) => {
            void (async () => {
              try {
                await api.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  order_id: order.id,
                })
                clear()
                setDoneId(order.id)
                resolve()
              } catch (err) {
                reject(err)
              }
            })()
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete payment')
    } finally {
      setSubmitting(false)
    }
  }

  if (doneId) {
    return (
      <div className="page cart-page checkout-page">
        <div className="success-card">
          <h1>Payment successful!</h1>
          <p>Your order #{doneId} is confirmed and on its way to the kitchen.</p>
          <button type="button" className="btn btn-yellow" onClick={() => navigate('/')}>
            Keep exploring
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page cart-page checkout-page">
      <CouponConfetti burstKey={confettiBurst} />
      <div className="checkout-hero">
        <Link to="/" className="checkout-back" aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <h1>Cart</h1>
      </div>

      {!lines.length ? (
        <div className="cart-empty">
          <div className="cart-empty__stage" aria-hidden>
            <img
              src="/media/images/allo-tikki-burger-removebg-preview.png"
              alt=""
              className="cart-empty__float cart-empty__float--a"
            />
            <img
              src="/media/images/corn_1_1-removebg-preview.png"
              alt=""
              className="cart-empty__float cart-empty__float--b"
            />
            <img
              src="/media/categoryimg/pastaa.png"
              alt=""
              className="cart-empty__float cart-empty__float--c"
            />
          </div>

          <div className="cart-empty__copy">
            <h2>Cart is empty</h2>
            <p>Add something tasty.</p>
          </div>

          <Link to="/search?view=all" className="btn btn-yellow cart-empty__cta">
            Browse menu
          </Link>
        </div>
      ) : (
        <form id="checkout-form" className="checkout-body" onSubmit={(e) => void onCheckout(e)}>
          <ul className="checkout-items">
            {lines.map((line) => {
              const unit = lineUnitPrice(line.item, line.toppings)
              const lineTotal = unit * line.quantity
              const fading = removingKeys.includes(line.key)
              return (
                <li
                  key={line.key}
                  className={`checkout-item${fading ? ' checkout-item--out' : ''}`}
                >
                  <div className="checkout-item-media">
                    <img src={line.item.image_url} alt={line.item.name} />
                  </div>
                  <div className="checkout-item-info">
                    <h3>{line.item.name}</h3>
                    {line.toppings.length > 0 && (
                      <p className="checkout-toppings">
                        {line.toppings.map((t) => t.name).join(', ')}
                      </p>
                    )}
                    <div className="checkout-qty">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => setQuantity(line.key, line.quantity - 1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span>{padQty(line.quantity)}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() => setQuantity(line.key, line.quantity + 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="checkout-item-end">
                    <p className="checkout-line-total" aria-label="Line total">
                      {unit}×{line.quantity}={lineTotal}
                    </p>
                    <button
                      type="button"
                      className="checkout-item-remove"
                      aria-label={`Remove ${line.item.name}`}
                      onClick={() => removeLine(line.key)}
                    >
                      <X size={14} strokeWidth={2.6} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <section className={`checkout-offers${couponOpen ? ' is-open' : ''}`}>
            <div className="checkout-offers__line" ref={couponMenuRef}>
              <Ticket size={15} className="checkout-offers__ico" />
              <span className="checkout-offers__label">Coupon</span>
              <div
                className={`promo-dd promo-dd--inline${couponOpen ? ' open' : ''}${!couponOptions.length ? ' disabled' : ''}`}
              >
                <button
                  type="button"
                  className="promo-dd__trigger"
                  aria-haspopup="listbox"
                  aria-expanded={couponOpen}
                  disabled={!couponOptions.length}
                  onClick={() => setCouponOpen((v) => !v)}
                >
                  <span className="promo-dd__value">
                    {promoInput
                      ? couponOptions.find((c) => c.code === promoInput)?.code || promoInput
                      : couponOptions.length
                        ? 'Choose'
                        : 'Locked'}
                  </span>
                  <ChevronDown size={14} className="promo-dd__chevron" />
                </button>
              </div>
              <button
                type="button"
                className={`promo-clear${promoApplied > 0 ? '' : ' is-hidden'}`}
                aria-label="Remove coupon"
                tabIndex={promoApplied > 0 ? 0 : -1}
                disabled={promoApplied <= 0}
                onClick={() => {
                  clearCoupon()
                  setCouponOpen(false)
                }}
              >
                <X size={13} strokeWidth={2.4} />
              </button>
              {couponOpen && couponOptions.length > 0 && (
                <ul className="promo-dd__menu" role="listbox">
                  <li role="option" aria-selected={!promoInput}>
                    <button
                      type="button"
                      className={`promo-dd__option${!promoInput ? ' active' : ''}`}
                      onClick={() => {
                        onSelectCoupon('')
                        setCouponOpen(false)
                      }}
                    >
                      No coupon
                    </button>
                  </li>
                  {couponOptions.map((opt) => (
                    <li key={opt.code} role="option" aria-selected={promoInput === opt.code}>
                      <button
                        type="button"
                        className={`promo-dd__option${promoInput === opt.code ? ' active' : ''}${opt.eligible ? '' : ' is-disabled'}`}
                        disabled={!opt.eligible}
                        onClick={() => {
                          onSelectCoupon(opt.code)
                          setCouponOpen(false)
                        }}
                      >
                        <span>
                          {opt.code}
                          {!opt.eligible && opt.minOrder ? (
                            <small> Min ₹{opt.minOrder}</small>
                          ) : null}
                          {opt.oneTime ? <small> One time</small> : null}
                        </span>
                        <em>−₹{opt.amount}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label
              className={`checkout-offers__line wallet-pay-line${useWalletPay ? ' on' : ''}`}
            >
              <Wallet size={15} className="checkout-offers__ico" />
              <span className="checkout-offers__label">Pay with wallet</span>
              <span className="wallet-pay-line__meta">
                {useWalletPay && walletSpend > 0
                  ? `−₹${walletSpend}`
                  : `${formatMoney(balance)} left`}
              </span>
              <input
                type="checkbox"
                checked={useWalletPay}
                onChange={(e) => setUseWalletPay(e.target.checked)}
              />
            </label>
          </section>

          <div className="delivery-card delivery-card--compact">
            <h2>Dine-in details</h2>
            <div className="delivery-card__row">
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                Phone
                <input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  inputMode="numeric"
                />
              </label>
            </div>
          </div>

          <div className="totals-card">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="totals-row discount">
                <span>Coupon</span>
                <span>-{formatMoney(discount)}</span>
              </div>
            )}
            {walletSpend > 0 && (
              <div className="totals-row discount">
                <span>Wallet</span>
                <span>-{formatMoney(walletSpend)}</span>
              </div>
            )}
            <div className="totals-divider" />
            <div className="totals-row grand">
              <span>{razorpayDue > 0 ? 'Pay now' : 'Total'}</span>
              <strong>{formatMoney(razorpayDue > 0 ? razorpayDue : payable)}</strong>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
        </form>
      )}

      {lines.length > 0 && !doneId && (
        <button
          type="submit"
          form="checkout-form"
          className="checkout-fab"
          disabled={submitting}
        >
          {submitting
            ? 'Processing…'
            : `Pay Rs.${razorpayDue > 0 ? razorpayDue : payable}`}
        </button>
      )}
    </div>
  )
}
