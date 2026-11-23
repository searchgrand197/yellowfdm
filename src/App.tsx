import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './admin/AdminLayout'
import { AdminLogin } from './admin/AdminLogin'
import { CategoriesPage } from './admin/CategoriesPage'
import { CombosPage } from './admin/CombosPage'
import { CouponsPage } from './admin/CouponsPage'
import { HomepagePage } from './admin/HomepagePage'
import { OrdersPage } from './admin/OrdersPage'
import { ProductsPage } from './admin/ProductsPage'
import { ShopPage } from './admin/ShopPage'
import { ToppingsPage } from './admin/ToppingsPage'
import { AppShell } from './components/AppShell'
import { ScratchCard } from './components/ScratchCard'
import { ShopClosedGate } from './components/ShopClosedGate'
import { AuthProvider } from './context/AuthContext'
import { CartMagicProvider } from './context/CartMagicContext'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { ShopProvider } from './context/ShopContext'
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
      <ShopProvider>
        <WalletProvider>
          <CartProvider>
            <FavoritesProvider>
              <CartMagicProvider>
                <BrowserRouter>
                  <ScratchCard />
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<Navigate to="orders" replace />} />
                      <Route path="orders" element={<OrdersPage />} />
                      <Route path="categories" element={<CategoriesPage />} />
                      <Route path="products" element={<ProductsPage />} />
                      <Route path="toppings" element={<ToppingsPage />} />
                      <Route path="coupons" element={<CouponsPage />} />
                      <Route path="combos" element={<CombosPage />} />
                      <Route path="homepage" element={<HomepagePage />} />
                      <Route path="shop" element={<ShopPage />} />
                    </Route>
                    <Route
                      element={
                        <ShopClosedGate>
                          <AppShell />
                        </ShopClosedGate>
                      }
                    >
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
      </ShopProvider>
    </AuthProvider>
  )
}
