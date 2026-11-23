import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { ScrollToTop } from './ScrollToTop'
import { StickyCart } from './StickyCart'

export function AppShell() {
  const { pathname } = useLocation()
  const onCart = pathname === '/cart'

  return (
    <div className={`app-shell${onCart ? ' app-shell--cart' : ''}`}>
      <ScrollToTop />
      <div className="app-frame">
        {!onCart && <StickyCart />}
        <main className="app-main">
          <Outlet />
        </main>
        {!onCart && <BottomNav />}
      </div>
    </div>
  )
}
