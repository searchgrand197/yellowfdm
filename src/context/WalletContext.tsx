import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'

const CLIENT_KEY = 'foodporium-client-key'
const LOCAL_BALANCE = 'foodporium-wallet-balance'
const LOCAL_PHONE = 'foodporium-wallet-phone'
const LOCAL_COUPON = 'foodporium-coupon'
const SCRATCHED = 'foodporium-scratched'

function makeClientKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `fp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function ensureClientKey() {
  let key = localStorage.getItem(CLIENT_KEY)
  if (!key) {
    key = makeClientKey()
    localStorage.setItem(CLIENT_KEY, key)
  }
  return key
}

interface WalletContextValue {
  clientKey: string
  phone: string
  balance: number
  couponCode: string | null
  scratched: boolean
  setPhone: (phone: string) => void
  refresh: (phoneOverride?: string) => Promise<void>
  debit: (amount: number) => Promise<number>
  claimScratch: () => Promise<{ reward_code: string; reward_amount: number }>
  markScratched: () => void
  saveCoupon: (code: string) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [clientKey] = useState(() => ensureClientKey())
  const [phone, setPhoneState] = useState(() => localStorage.getItem(LOCAL_PHONE) || '')
  const [balance, setBalance] = useState(() => Number(localStorage.getItem(LOCAL_BALANCE) || 0))
  const [couponCode, setCouponCode] = useState<string | null>(() => localStorage.getItem(LOCAL_COUPON))
  const [scratched, setScratched] = useState(() => localStorage.getItem(SCRATCHED) === '1')

  const persistBalance = (value: number) => {
    setBalance(value)
    localStorage.setItem(LOCAL_BALANCE, String(value))
  }

  const setPhone = (next: string) => {
    const cleaned = next.replace(/\D/g, '').slice(-10)
    setPhoneState(cleaned)
    localStorage.setItem(LOCAL_PHONE, cleaned)
  }

  const refresh = async (phoneOverride?: string) => {
    const activePhone =
      (phoneOverride || phone || localStorage.getItem(LOCAL_PHONE) || '').replace(/\D/g, '').slice(-10)
    if (!activePhone) return
    try {
      const data = await api.getWallet(activePhone)
      let serverBal = Number(data.balance)
      const localBal = Number(localStorage.getItem(LOCAL_BALANCE) || 0)
      if (localBal > serverBal) {
        const synced = await api.walletAction(activePhone, 'topup', localBal - serverBal)
        serverBal = Number(synced.balance)
      }
      persistBalance(serverBal)
    } catch {
      /* keep local */
    }
  }

  useEffect(() => {
    void refresh()
  }, [phone])

  const value = useMemo<WalletContextValue>(
    () => ({
      clientKey,
      phone,
      balance,
      couponCode,
      scratched,
      setPhone,
      refresh,
      debit: async (amount) => {
        if (amount <= 0) return balance
        if (phone) {
          const data = await api.walletAction(phone, 'debit', amount)
          persistBalance(Number(data.balance))
          return Number(data.balance)
        }
        if (balance < amount) throw new Error('Insufficient wallet balance')
        const next = balance - amount
        persistBalance(next)
        return next
      },
      claimScratch: async () => {
        const data = await api.claimScratch(clientKey, phone || undefined)
        setScratched(true)
        localStorage.setItem(SCRATCHED, '1')
        setCouponCode(data.reward_code)
        localStorage.setItem(LOCAL_COUPON, data.reward_code)
        if (data.wallet_balance != null) {
          persistBalance(Number(data.wallet_balance))
        } else {
          persistBalance(balance + Number(data.reward_amount))
        }
        return {
          reward_code: data.reward_code,
          reward_amount: Number(data.reward_amount),
        }
      },
      markScratched: () => {
        setScratched(true)
        localStorage.setItem(SCRATCHED, '1')
      },
      saveCoupon: (code: string) => {
        setCouponCode(code)
        localStorage.setItem(LOCAL_COUPON, code)
      },
    }),
    [clientKey, phone, balance, couponCode, scratched],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
