import { ArrowLeft, Minus, Plus, Ticket, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useCart } from '../context/CartContext'
import { useWallet } from '../context/WalletContext'
import { openRazorpayCheckout } from '../lib/razorpay'
import { lineUnitPrice } from '../types'
import { formatMoney } from '../utils/money'

const TAX_RATE = 0.05
const DELIVERY_FEE = 40
const FREE_DELIVERY_MIN = 200
const PROMO_CODES: Record<string, number> = {
  'FIRST TIME USER': 10,
  FIRSTTIME: 10,
  FOOD10: 10,
}

function padQty(n: number) {
  return String(n).padStart(2, '0')
}

export function CartPage() {
  const { lines, total: subtotal, setQuantity, clear } = useCart()
  const { balance, couponCode, scratched, setPhone, refresh } = useWallet()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [address, setAddress] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(0)
  const [promoMessage, setPromoMessage] = useState('')
  const [useWalletPay, setUseWalletPay] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [doneId, setDoneId] = useState<number | null>(null)

  const couponOptions = useMemo(() => {
    if (!scratched || !couponCode) return []
    const key = couponCode.toUpperCase()
    const amount = PROMO_CODES[key] ?? 10
    return [{ code: couponCode, amount, label: `${couponCode} · ₹${amount} off` }]
  }, [scratched, couponCode])

  useEffect(() => {
    if (!couponOptions.length || promoApplied) return
    const first = couponOptions[0]
    setPromoInput(first.code)
    setPromoApplied(first.amount)
    setPromoMessage(`₹${first.amount} off applied`)
  }, [couponOptions, promoApplied])

  const tax = useMemo(() => Math.round(subtotal * TAX_RATE), [subtotal])
  const delivery = subtotal >= FREE_DELIVERY_MIN || subtotal === 0 ? 0 : DELIVERY_FEE
  const discount = promoApplied
  const payable = Math.max(0, Math.round(subtotal + tax + delivery - discount))
  const walletSpend = useWalletPay ? Math.min(balance, payable) : 0
  const razorpayDue = Math.max(0, payable - walletSpend)

  const onSelectCoupon = (value: string) => {
    setPromoInput(value)
    if (!value) {
      setPromoApplied(0)
      setPromoMessage('')
      return
    }
    const match = couponOptions.find((c) => c.code === value)
    const amount = match?.amount ?? PROMO_CODES[value.trim().toUpperCase()] ?? 0
    if (!amount) {
      setPromoApplied(0)
      setPromoMessage('Invalid promo code')
      return
    }
    setPromoApplied(amount)
    setPromoMessage(`₹${amount} off applied`)
  }

  const onCheckout = async (e: FormEvent) => {
    e.preventDefault()
    if (!lines.length) return
    if (!name.trim() || !phoneInput.trim()) {
      setError('Please enter name and phone')
      return
    }
    if (!address.trim()) {
      setError('Please add a delivery address')
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
        address,
        notes: [
          discount ? `Promo discount: ₹${discount}` : '',
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
        <form className="checkout-body" onSubmit={(e) => void onCheckout(e)}>
          <ul className="checkout-items">
            {lines.map((line) => {
              const unit = lineUnitPrice(line.item, line.toppings)
              const lineTotal = unit * line.quantity
              return (
                <li key={line.key} className="checkout-item">
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
                    <p className="checkout-unit">{formatMoney(unit)}</p>
                    <div className="checkout-qty">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => setQuantity(line.key, line.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{padQty(line.quantity)}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() => setQuantity(line.key, line.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <strong className="checkout-line-total">{formatMoney(lineTotal)}</strong>
                </li>
              )
            })}
          </ul>

          <div className="promo-row promo-row--select">
            <div className="promo-field">
              <Ticket size={18} />
              <select
                className="promo-select"
                value={promoInput}
                onChange={(e) => onSelectCoupon(e.target.value)}
                disabled={!couponOptions.length}
              >
                <option value="">
                  {couponOptions.length ? 'Select coupon' : 'Scratch card to unlock coupon'}
                </option>
                {couponOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {promoMessage && (
            <p className={`promo-msg${promoApplied ? ' ok' : ''}`}>{promoMessage}</p>
          )}

          <div className="delivery-card">
            <h2>Delivery details</h2>
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
              />
            </label>
            <label>
              Address
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={2}
                placeholder="House / street / landmark"
              />
            </label>
          </div>

          <label className={`wallet-pay-toggle${useWalletPay ? ' on' : ''}`}>
            <input
              type="checkbox"
              checked={useWalletPay}
              onChange={(e) => setUseWalletPay(e.target.checked)}
            />
            <Wallet size={18} />
            <span>
              Pay with wallet ({formatMoney(balance)} available)
            </span>
          </label>

          <div className="totals-card">
            <div className="totals-row">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="totals-row">
              <span>Tax & Fee</span>
              <span>{formatMoney(tax)}</span>
            </div>
            <div className="totals-row">
              <span>Delivery</span>
              <span>{delivery === 0 ? 'Free' : formatMoney(delivery)}</span>
            </div>
            {discount > 0 && (
              <div className="totals-row discount">
                <span>Promo</span>
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

          <button type="submit" className="checkout-cta" disabled={submitting}>
            {submitting
              ? 'Processing…'
              : razorpayDue > 0
                ? `CHECKOUT · ${formatMoney(razorpayDue)}`
                : 'CHECKOUT WITH WALLET'}
          </button>
        </form>
      )}
    </div>
  )
}
