import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Combo, MenuItem } from '../types'
import { AdminCheck, AdminCheckGroup, AdminField } from './AdminField'
import { AdminImageField } from './AdminImageField'
import { AdminModal } from './AdminModal'
import { useReorder } from './useReorder'

const MAX_ITEMS = 4

function slotsFromCombo(row: Combo): number[] {
  const ids = row.item_ids?.length
    ? [...row.item_ids]
    : [row.item_a, row.item_b, row.item_c, row.item_d].filter((id): id is number => Boolean(id))
  while (ids.length < 2) ids.push(0)
  return ids.slice(0, MAX_ITEMS)
}

export function CombosPage() {
  const [rows, setRows] = useState<Combo[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [name, setName] = useState('')
  const [badge, setBadge] = useState('Combo')
  const [slots, setSlots] = useState<number[]>([0, 0])
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [active, setActive] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const actualPrice = useMemo(() => {
    return slots.reduce((sum, id) => {
      const item = byId.get(id)
      return sum + (item ? Number(item.price) : 0)
    }, 0)
  }, [slots, byId])

  const comboPriceNum = Number(price) || 0
  const saveAmount = Math.max(0, Math.round((actualPrice - comboPriceNum) * 100) / 100)

  const load = async () => {
    const [combos, products] = await Promise.all([api.admin.listCombos(), api.admin.listItems()])
    setRows(combos)
    setItems(products)
  }

  useEffect(() => {
    void load()
  }, [])

  const { dragging, onDragStart, onDragOver, onDragEnd } = useReorder(rows, setRows, (ids) =>
    api.admin.reorderCombos(ids),
  )

  const defaultSlots = () => [items[0]?.id || 0, items[1]?.id || items[0]?.id || 0]

  const closeModal = () => {
    setOpen(false)
    setEditId(null)
    setName('')
    setBadge('Combo')
    setPrice('')
    setImageUrl('')
    setActive(true)
    setSlots(defaultSlots())
    setError('')
  }

  const openCreate = () => {
    setEditId(null)
    setName('')
    setBadge('Combo')
    setPrice('')
    setImageUrl('')
    setActive(true)
    setSlots(defaultSlots())
    setError('')
    setOpen(true)
  }

  const setSlot = (index: number, id: number) => {
    setSlots((prev) => prev.map((v, i) => (i === index ? id : v)))
  }

  const addSlot = () => {
    if (slots.length >= MAX_ITEMS) return
    const nextId = items.find((i) => !slots.includes(i.id))?.id || items[0]?.id || 0
    setSlots((prev) => [...prev, nextId])
  }

  const removeSlot = (index: number) => {
    if (slots.length <= 2) return
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const chosen = slots.filter(Boolean)
    if (chosen.length < 2) {
      setError('Pick at least 2 items')
      return
    }
    if (new Set(chosen).size !== chosen.length) {
      setError('Each combo item must be different')
      return
    }
    if (!price || comboPriceNum <= 0) {
      setError('Enter a combo price')
      return
    }
    try {
      await api.admin.saveCombo(
        {
          name,
          badge,
          item_a: chosen[0],
          item_b: chosen[1],
          item_c: chosen[2] || null,
          item_d: chosen[3] || null,
          price: comboPriceNum,
          active,
          sort_order: editId
            ? rows.find((r) => r.id === editId)?.sort_order ?? rows.length
            : rows.length,
          image_url: imageUrl,
        },
        editId || undefined,
      )
      closeModal()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save combo')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Combos</h1>
        <button type="button" className="admin-btn" onClick={openCreate}>
          <Plus size={16} /> Add combo
        </button>
      </div>
      <p className="admin-hint">Drag rows to set sequence order.</p>
      {!rows.length ? <p className="muted">No combos yet. Click Add combo.</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th className="admin-drag-col" />
            <th>Name</th>
            <th>Items</th>
            <th>Actual</th>
            <th>Combo</th>
            <th>Save</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={dragging === row.id ? 'is-dragging' : ''}
              draggable
              onDragStart={() => onDragStart(row.id)}
              onDragOver={(e) => onDragOver(e, row.id)}
              onDragEnd={() => void onDragEnd()}
            >
              <td className="admin-drag-col">
                <GripVertical size={16} />
              </td>
              <td>
                {row.name} <em>{row.badge}</em>
              </td>
              <td>{(row.item_names || [row.item_a_name, row.item_b_name]).filter(Boolean).join(' + ')}</td>
              <td>₹{row.actual_price ?? '—'}</td>
              <td>₹{row.price}</td>
              <td>₹{row.save_amount}</td>
              <td>{row.active ? 'Yes' : 'No'}</td>
              <td className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(row.id)
                    setName(row.name)
                    setBadge(row.badge)
                    setSlots(slotsFromCombo(row))
                    setPrice(String(row.price))
                    setImageUrl(row.image_url || '')
                    setActive(row.active)
                    setError('')
                    setOpen(true)
                  }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => void api.admin.deleteCombo(row.id).then(load)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdminModal open={open} title={editId ? 'Edit combo' : 'Add combo'} onClose={closeModal}>
        <form className="admin-form admin-form--modal admin-form--grid" onSubmit={(e) => void onSubmit(e)}>
          <AdminField label="Combo name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </AdminField>
          <AdminField label="Badge">
            <input value={badge} onChange={(e) => setBadge(e.target.value)} />
          </AdminField>

          {slots.map((slotId, index) => (
            <AdminField
              key={`slot-${index}`}
              label={`Item ${index + 1}`}
              full={index >= 2 && slots.length === index + 1 && slots.length < MAX_ITEMS}
            >
              <div className="admin-combo-slot">
                <select value={slotId} onChange={(e) => setSlot(index, Number(e.target.value))}>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · ₹{i.price}
                    </option>
                  ))}
                </select>
                {slots.length > 2 ? (
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={() => removeSlot(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            </AdminField>
          ))}

          {slots.length < MAX_ITEMS ? (
            <div className="admin-field admin-field--full">
              <button type="button" className="admin-btn ghost" onClick={addSlot}>
                <Plus size={16} /> Add item ({slots.length}/{MAX_ITEMS})
              </button>
            </div>
          ) : null}

          <AdminField label="Actual price (₹)" hint="Sum of selected items">
            <input value={actualPrice.toFixed(2)} readOnly />
          </AdminField>
          <AdminField label="Combo price (₹)" hint="What the customer pays">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={actualPrice ? String(Math.max(1, Math.round(actualPrice * 0.85))) : '0'}
              required
            />
          </AdminField>
          <AdminField label="You save (₹)" hint="Calculated automatically" full>
            <input value={saveAmount.toFixed(2)} readOnly />
          </AdminField>

          <AdminImageField
            value={imageUrl}
            onChange={setImageUrl}
            label="Combo photo"
            variant="product"
          />
          <AdminCheckGroup label="Status">
            <AdminCheck label="Active" checked={active} onChange={setActive} />
          </AdminCheckGroup>
          {error ? <p className="admin-error">{error}</p> : null}
          <button type="submit" className="admin-btn">
            {editId ? 'Save changes' : 'Add combo'}
          </button>
        </form>
      </AdminModal>
    </div>
  )
}
