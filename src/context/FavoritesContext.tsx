import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'foodporium_favorites'

function readStoredIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is number => typeof id === 'number'))
  } catch {
    return new Set()
  }
}

function writeStoredIds(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

interface FavoritesContextValue {
  count: number
  ids: Set<number>
  isFavorite: (id: number) => boolean
  toggle: (id: number) => Promise<boolean>
  refresh: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<number>>(() => readStoredIds())

  const refresh = useCallback(async () => {
    setIds(readStoredIds())
  }, [])

  useEffect(() => {
    writeStoredIds(ids)
  }, [ids])

  const isFavorite = useCallback((id: number) => ids.has(id), [ids])

  const toggle = useCallback(async (id: number) => {
    const liked = ids.has(id)
    setIds((prev) => {
      const next = new Set(prev)
      if (liked) next.delete(id)
      else next.add(id)
      return next
    })
    return !liked
  }, [ids])

  const value = useMemo(
    () => ({
      count: ids.size,
      ids,
      isFavorite,
      toggle,
      refresh,
    }),
    [ids, isFavorite, toggle, refresh],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
