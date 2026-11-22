import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { StickyCart } from './StickyCart'

export function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <StickyCart />
        <main className="app-main">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
