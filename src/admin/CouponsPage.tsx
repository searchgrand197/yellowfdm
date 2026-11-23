import { Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Coupon } from '../types'
import { AdminCheck, AdminCheckGroup, AdminField } from './AdminField'
import { AdminModal } from './AdminModal'

export function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([])
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('10')
  const [minOrder, setMinOrder] = useState('0')
  const [oneTime, setOneTime] = useState(false)
  const [active, setActive] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => setRows(await api.admin.listCoupons())
  useEffect(() => {
    void load()
  }, [])

  const closeModal = () => {
    setOpen(false)
    setEditId(null)
    setCode('')
    setAmount('10')
    setMinOrder('0')
    setOneTime(false)
    setActive(true)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await api.admin.saveCoupon(
      {
        code: code.trim().toUpperCase(),
        amount,
        min_order_value: minOrder || '0',
        one_time: oneTime,
        active,
      },
      editId || undefined,
    )
    closeModal()
    await load()
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Coupons</h1>
        <button
          type="button"
          className="admin-btn"
          onClick={() => {
            closeModal()
            setOpen(true)
          }}
        >
          <Plus size={16} /> Add coupon
        </button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Amount</th>
            <th>Min order</th>
            <th>One time</th>
            <th>Used</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.code}</td>
              <td>₹{row.amount}</td>
              <td>₹{row.min_order_value ?? 0}</td>
              <td>{row.one_time ? 'Yes' : 'No'}</td>
              <td>{row.used_count}</td>
              <td>{row.active ? 'Yes' : 'No'}</td>
              <td className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(row.id)
                    setCode(row.code)
                    setAmount(String(row.amount))
                    setMinOrder(String(row.min_order_value ?? 0))
                    setOneTime(Boolean(row.one_time))
                    setActive(row.active)
                    setOpen(true)
                  }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => void api.admin.deleteCoupon(row.id).then(load)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdminModal open={open} title={editId ? 'Edit coupon' : 'Add coupon'} onClose={closeModal}>
        <form className="admin-form admin-form--modal admin-form--grid" onSubmit={(e) => void onSubmit(e)}>
          <AdminField label="Code">
            <input value={code} onChange={(e) => setCode(e.target.value)} required />
          </AdminField>
          <AdminField label="Discount amount (₹)">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </AdminField>
          <AdminField label="Minimum order (₹)" hint="Coupon only applies at or above this total" full>
            <input
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="e.g. 199"
            />
          </AdminField>
          <AdminCheckGroup label="Rules">
            <AdminCheck label="Active" checked={active} onChange={setActive} />
            <AdminCheck
              label="One time only"
              checked={oneTime}
              onChange={setOneTime}
            />
          </AdminCheckGroup>
          <p className="admin-hint" style={{ gridColumn: '1 / -1', margin: 0 }}>
            One time only: each phone number can use this coupon once.
          </p>
          <button type="submit" className="admin-btn">
            {editId ? 'Save changes' : 'Add coupon'}
          </button>
        </form>
      </AdminModal>
    </div>
  )
}
