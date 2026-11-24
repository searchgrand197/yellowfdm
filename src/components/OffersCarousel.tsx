import { BadgePercent } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import type { Coupon } from '../types'
import { formatMoney } from '../utils/money'

type OfferCard = {
  id: string
  code: string
  title: string
  subtitle: string
  accent: number
}

function buildOffers(coupons: Coupon[]): OfferCard[] {
  if (coupons.length) {
    return coupons.map((c, idx) => {
      const amount = Number(c.amount)
      const min = Number(c.min_order_value || 0)
      return {
        id: `coupon-${c.id}`,
        code: c.code,
        title: `Get up to ${formatMoney(amount)} Off`,
        subtitle:
          min > 0
            ? `Up to ${formatMoney(amount)} Off on orders worth ${formatMoney(min)} or more`
            : `Use code ${c.code} at checkout for ${formatMoney(amount)} off`,
        accent: idx % 3,
      }
    })
  }

  // Fallback so the section still shows when no coupons are configured
  return [
    {
      id: 'fallback-80',
      code: 'FOOD10',
      title: 'Get up to ₹80 Off',
      subtitle: 'Up to ₹80 Off on orders worth ₹299 or more',
      accent: 0,
    },
    {
      id: 'fallback-first',
      code: 'FIRST TIME USER',
      title: 'First order treat',
      subtitle: 'Flat ₹10 off for first-time users at checkout',
      accent: 1,
    },
  ]
}

export function OffersCarousel({ coupons }: { coupons: Coupon[] }) {
  const navigate = useNavigate()
  const { saveCoupon } = useWallet()
  const offers = buildOffers(coupons)

  if (!offers.length) return null

  const onView = (offer: OfferCard) => {
    if (offer.code) saveCoupon(offer.code)
    navigate('/cart')
  }

  return (
    <section className="offers-section" aria-label="Offers for you">
      <div className="section-head">
        <h2>Offers for you</h2>
      </div>
      <div className="offers-carousel">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className={`offers-card offers-card--a${offer.accent}`}
          >
            <div className="offers-card__icon" aria-hidden>
              <BadgePercent size={14} strokeWidth={2.4} />
            </div>
            <div className="offers-card__copy">
              <strong>{offer.title}</strong>
              <p>{offer.subtitle}</p>
            </div>
            <button
              type="button"
              className="offers-card__view"
              onClick={() => onView(offer)}
            >
              View
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
