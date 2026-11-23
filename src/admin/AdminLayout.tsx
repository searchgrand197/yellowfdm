import {
  BadgePercent,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  Sandwich,
  Settings2,
  ShoppingBag,
  Store,
  Tags,
} from 'lucide-react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ShopSettings } from '../types'

const NAV = [
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/toppings', label: 'Toppings', icon: Sandwich },
  { to: '/admin/coupons', label: 'Coupons', icon: BadgePercent },
  { to: '/admin/combos', label: 'Combos', icon: Layers },
  { to: '/admin/homepage', label: 'Homepage', icon: LayoutDashboard },
  { to: '/admin/shop', label: 'Shop', icon: Store },
]

export function AdminLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [shop, setShop] = useState<ShopSettings | null>(null)

  useEffect(() => {
    if (!user?.is_staff) return
    void api.admin.getShop().then(setShop).catch(() => setShop(null))
  }, [user])

  if (loading) {
    return <div className="admin-boot">Loading admin…</div>
  }
  if (!user?.is_staff) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <strong>Foodporium</strong>
          <span>Admin</span>
        </div>
        <nav className="admin-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="admin-logout"
          onClick={() => void logout().then(() => navigate('/admin/login'))}
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <div>
            <p className="admin-top__user">Signed in as {user.username}</p>
          </div>
          <div className={`admin-shop-pill${shop?.is_open ? ' open' : ' closed'}`}>
            <Settings2 size={14} />
            {shop?.is_open ? 'Shop open' : 'Shop closed'}
          </div>
        </header>
        <div className="admin-content">
          <Outlet context={{ shop, setShop }} />
        </div>
      </div>
    </div>
  )
}
