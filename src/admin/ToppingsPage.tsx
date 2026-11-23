import { Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Topping } from '../types'
import { AdminCheck, AdminCheckGroup, AdminField } from './AdminField'
import { AdminModal } from './AdminModal'

export function ToppingsPage() {
  const [rows, setRows] = useState<Topping[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [available, setAvailable] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => setRows(await api.admin.listToppings())
  useEffect(() => {
    void load()
  }, [])

  const closeModal = () => {
    setOpen(false)
    setEditId(null)
    setName('')
    setPrice('0')
    setAvailable(true)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await api.admin.saveTopping({ name, price, available }, editId || undefined)
    closeModal()
    await load()
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Toppings</h1>
        <button
          type="button"
          className="admin-btn"
          onClick={() => {
            closeModal()
            setOpen(true)
          }}
        >
          <Plus size={16} /> Add topping
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>₹{row.price}</td>
              <td>{row.available ? 'Yes' : 'No'}</td>
              <td className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(row.id)
                    setName(row.name)
                    setPrice(String(row.price))
                    setAvailable(row.available)
                    setOpen(true)
                  }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => void api.admin.deleteTopping(row.id).then(load)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdminModal open={open} title={editId ? 'Edit topping' : 'Add topping'} onClose={closeModal}>
        <form className="admin-form admin-form--modal admin-form--grid" onSubmit={(e) => void onSubmit(e)}>
          <AdminField label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </AdminField>
          <AdminField label="Price (₹)">
            <input value={price} onChange={(e) => setPrice(e.target.value)} />
          </AdminField>
          <AdminCheckGroup label="Status">
            <AdminCheck label="Available" checked={available} onChange={setAvailable} />
          </AdminCheckGroup>
          <button type="submit" className="admin-btn">
            {editId ? 'Save changes' : 'Add topping'}
          </button>
        </form>
      </AdminModal>
    </div>
  )
}
