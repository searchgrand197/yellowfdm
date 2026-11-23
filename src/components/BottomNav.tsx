import { Heart, Home, LayoutGrid, Search, UserRound } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useFavorites } from '../context/FavoritesContext'

export function BottomNav() {
  const location = useLocation()
  const { count } = useFavorites()
  const params = new URLSearchParams(location.search)
  const viewingAll = location.pathname === '/search' && params.get('view') === 'all'
  const onSearch = location.pathname === '/search' && !viewingAll

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
      >
        <Home size={22} strokeWidth={1.8} />
        <span className="sr-only">Home</span>
      </NavLink>

      <NavLink
        to="/favorites"
        className={({ isActive }) => `nav-tab nav-tab--fav${isActive ? ' active' : ''}`}
        aria-label={`Favorites, ${count} items`}
      >
        <span className="nav-heart">
          <Heart className="nav-heart__icon" size={22} strokeWidth={1.8} />
          <span className="nav-heart__count">{count}</span>
        </span>
        <span className="sr-only">Favorites</span>
      </NavLink>

      <NavLink
        to="/search?view=all"
        className={`nav-tab nav-tab--center${viewingAll ? ' active' : ''}`}
        aria-label="Menu"
      >
        <span className="nav-center-btn">
          <LayoutGrid size={14} strokeWidth={2.4} aria-hidden />
          <span className="nav-center-label">MENU</span>
        </span>
        <span className="sr-only">Menu</span>
      </NavLink>

      <NavLink to="/search" className={`nav-tab${onSearch ? ' active' : ''}`}>
        <Search size={22} strokeWidth={1.8} />
        <span className="sr-only">Search</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
      >
        <UserRound size={22} strokeWidth={1.8} />
        <span className="sr-only">Profile</span>
      </NavLink>
    </nav>
  )
}
