import { LogIn, LogOut, Plus, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { formatMoney } from '../utils/money'

const TOPUPS = [50, 100, 200, 500]

export function ProfilePage() {
  const { user, phone: authPhone, logout } = useAuth()
  const { balance, phone, couponCode, setPhone, topUp, refresh } = useWallet()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user || !authPhone) return
    setPhone(authPhone)
    void refresh(authPhone)
  }, [user, authPhone])

  const handleTopUp = async (amount: number) => {
    if (!user) return
    setBusy(true)
    setMessage('')
    try {
      if (authPhone) setPhone(authPhone)
      else if (phone) setPhone(phone)
      await topUp(amount)
      setMessage(`${formatMoney(amount)} added to wallet`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Top-up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page profile-page">
      <h1 className="page-title">Profile</h1>

      <div className="delivery-card">
        <h2>Account</h2>
        {user ? (
          <>
            <p className="muted">Signed in as</p>
            <strong>+91 {authPhone || user.username}</strong>
            {user.first_name && <p className="muted">{user.first_name}</p>}
            <button
              type="button"
              className="btn btn-outline grow"
              onClick={() => void logout()}
            >
              <LogOut size={16} /> Log out
            </button>
          </>
        ) : (
          <>
            <p className="muted">Login with your phone to sync orders and wallet.</p>
            <Link to="/login" className="btn btn-dark grow">
              <LogIn size={16} /> Login with phone
            </Link>
          </>
        )}
      </div>

      {user ? (
        <>
          <div className="wallet-hero">
            <div className="wallet-icon">
              <Wallet size={28} />
            </div>
            <p>Available balance</p>
            <strong>{formatMoney(balance)}</strong>
          </div>

          <div className="delivery-card">
            <h2>Add money</h2>
            <div className="topup-grid">
              {TOPUPS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="topup-chip"
                  disabled={busy}
                  onClick={() => void handleTopUp(amount)}
                >
                  <Plus size={14} /> {formatMoney(amount)}
                </button>
              ))}
            </div>
          </div>

          {couponCode && (
            <div className="coupon-banner">
              <p>Your coupon</p>
              <strong>{couponCode}</strong>
              <span>Apply on checkout for ₹10 off</span>
            </div>
          )}

          {message && <p className="promo-msg ok">{message}</p>}

          <Link to="/cart" className="btn btn-yellow grow">
            Go to cart
          </Link>
        </>
      ) : null}
    </div>
  )
}
