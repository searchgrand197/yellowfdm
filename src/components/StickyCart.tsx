import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function scrollAppToTop() {
  const main = document.querySelector<HTMLElement>('.app-main')
  main?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

export function StickyCart() {
  const { count } = useCart()

  return (
    <Link
      to="/cart"
      className="sticky-cart"
      data-cart-fly-target
      aria-label={count > 0 ? `${count} items in cart` : 'Cart'}
      onClick={() => {
        // Open cart from the top of the page every time.
        requestAnimationFrame(scrollAppToTop)
      }}
    >
      <span className="sticky-cart__glow" aria-hidden />
      <span className="sticky-cart__btn">
        <ShoppingBag size={20} strokeWidth={2.2} />
        {count > 0 && <span className="sticky-cart__count">{count}</span>}
      </span>
    </Link>
  )
}
