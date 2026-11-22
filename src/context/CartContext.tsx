import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cartLineKey, lineUnitPrice, type CartLine, type MenuItem, type Topping } from '../types'

interface CartContextValue {
  lines: CartLine[]
  count: number
  total: number
  addItem: (item: MenuItem, quantity?: number, toppings?: Topping[]) => void
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'foodporium-cart-v2'

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as CartLine[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0)
    const total = lines.reduce(
      (sum, line) => sum + lineUnitPrice(line.item, line.toppings) * line.quantity,
      0,
    )

    return {
      lines,
      count,
      total,
      addItem: (item, quantity = 1, toppings = []) => {
        const selected = toppings.filter((t) => t.available !== false)
        const key = cartLineKey(item.id, selected)
        setLines((prev) => {
          const existing = prev.find((line) => line.key === key)
          if (existing) {
            return prev.map((line) =>
              line.key === key ? { ...line, quantity: line.quantity + quantity } : line,
            )
          }
          return [...prev, { key, item, quantity, toppings: selected }]
        })
      },
      setQuantity: (key, quantity) => {
        setLines((prev) =>
          quantity <= 0
            ? prev.filter((line) => line.key !== key)
            : prev.map((line) => (line.key === key ? { ...line, quantity } : line)),
        )
      },
      removeItem: (key) => setLines((prev) => prev.filter((line) => line.key !== key)),
      clear: () => setLines([]),
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
