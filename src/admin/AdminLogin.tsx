import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AdminLogin() {
  const { user, loading, loginWithPassword } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user?.is_staff) {
    return <Navigate to="/admin/orders" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const u = await loginWithPassword(username.trim(), password)
      if (!u.is_staff) {
        setError('This account is not staff. Use a Django superuser.')
        return
      }
      navigate('/admin/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={(e) => void onSubmit(e)}>
        <h1>Foodporium Admin</h1>
        <p>Staff sign-in for kitchen & catalog control.</p>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button type="submit" className="admin-btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Enter portal'}
        </button>
      </form>
    </div>
  )
}
