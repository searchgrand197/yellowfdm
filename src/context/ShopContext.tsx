import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { ShopSettings } from '../types'

interface ShopContextValue {
  shop: ShopSettings | null
  loading: boolean
  refresh: () => Promise<void>
}

const ShopContext = createContext<ShopContextValue | null>(null)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const cfg = await api.getConfig()
      setShop(cfg.shop)
    } catch {
      setShop({ is_open: true, reopens_at: null, closed_message: '' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 30000)
    return () => window.clearInterval(id)
  }, [])

  const value = useMemo(() => ({ shop, loading, refresh }), [shop, loading])
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within ShopProvider')
  return ctx
}
