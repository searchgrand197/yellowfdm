import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ScratchCard } from './components/ScratchCard'
import { AuthProvider } from './context/AuthContext'
import { CartMagicProvider } from './context/CartMagicContext'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { WalletProvider } from './context/WalletContext'
import { LoginPage, SignupPage } from './pages/AuthPages'
import { CartPage } from './pages/CartPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { ProfilePage } from './pages/ProfilePage'
import { SearchPage } from './pages/SearchPage'

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <CartProvider>
          <FavoritesProvider>
            <CartMagicProvider>
              <BrowserRouter>
                <ScratchCard />
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route element={<AppShell />}>
                    <Route path="/" element={<DiscoverPage />} />
                    <Route path="/discover" element={<DiscoverPage />} />
                    <Route path="/item/:id" element={<Navigate to="/search?view=all" replace />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </CartMagicProvider>
          </FavoritesProvider>
        </CartProvider>
      </WalletProvider>
    </AuthProvider>
  )
}
