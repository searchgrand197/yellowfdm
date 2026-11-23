import { useEffect, useRef, useState } from 'react'

/** HTML5 drag-and-drop reorder helper for admin lists. */
export function useReorder<T extends { id: number }>(
  rows: T[],
  setRows: (next: T[]) => void,
  persist: (ids: number[]) => Promise<unknown>,
) {
  const dragId = useRef<number | null>(null)
  const rowsRef = useRef(rows)
  const [dragging, setDragging] = useState<number | null>(null)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const onDragStart = (id: number) => {
    dragId.current = id
    setDragging(id)
  }

  const onDragOver = (e: React.DragEvent, overId: number) => {
    e.preventDefault()
    const fromId = dragId.current
    if (fromId == null || fromId === overId) return
    const prev = rowsRef.current
    const from = prev.findIndex((r) => r.id === fromId)
    const to = prev.findIndex((r) => r.id === overId)
    if (from < 0 || to < 0 || from === to) return
    const next = [...prev]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    rowsRef.current = next
    setRows(next)
  }

  const onDragEnd = async () => {
    const ids = rowsRef.current.map((r) => r.id)
    setDragging(null)
    dragId.current = null
    try {
      await persist(ids)
    } catch {
      /* parent can reload */
    }
  }

  return { dragging, onDragStart, onDragOver, onDragEnd }
}
