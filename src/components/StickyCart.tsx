import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export function StickyCart() {
  const { count } = useCart()

  return (
    <Link
      to="/cart"
      className="sticky-cart"
      data-cart-fly-target
      aria-label={count > 0 ? `${count} items in cart` : 'Cart'}
    >
      <span className="sticky-cart__glow" aria-hidden />
      <span className="sticky-cart__btn">
        <ShoppingBag size={20} strokeWidth={2.2} />
        {count > 0 && <span className="sticky-cart__count">{count}</span>}
      </span>
    </Link>
  )
}
