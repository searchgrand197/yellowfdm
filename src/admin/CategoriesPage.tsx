import { GripVertical, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Category } from '../types'
import { AdminField } from './AdminField'
import { AdminImageField } from './AdminImageField'
import { AdminModal } from './AdminModal'
import { useReorder } from './useReorder'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const empty = { name: '', icon: 'burger', image_url: '' }

export function CategoriesPage() {
  const [rows, setRows] = useState<Category[]>([])
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState<number | null>(null)
  const [editSlug, setEditSlug] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const load = async () => setRows(await api.admin.listCategories())

  useEffect(() => {
    void load().catch((e) => setError(String(e.message || e)))
  }, [])

  const { dragging, onDragStart, onDragOver, onDragEnd } = useReorder(rows, setRows, (ids) =>
    api.admin.reorderCategories(ids),
  )

  const closeModal = () => {
    setOpen(false)
    setEditId(null)
    setEditSlug('')
    setForm(empty)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await api.admin.saveCategory(
      {
        name: form.name,
        slug: editId ? editSlug || slugify(form.name) : slugify(form.name),
        icon: form.icon || 'burger',
        image_url: form.image_url,
        sort_order: editId
          ? rows.find((r) => r.id === editId)?.sort_order ?? rows.length
          : rows.length,
      },
      editId || undefined,
    )
    closeModal()
    await load()
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <h1>Categories</h1>
        <button
          type="button"
          className="admin-btn"
          onClick={() => {
            setEditId(null)
            setEditSlug('')
            setForm(empty)
            setOpen(true)
          }}
        >
          <Plus size={16} /> Add category
        </button>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <p className="admin-hint">Drag rows to set sequence order.</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th className="admin-drag-col" />
            <th>Image</th>
            <th>Name</th>
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
                <div className="admin-cat-preview">
                  <span className="admin-cat-preview__blob" aria-hidden />
                  {row.image_url ? (
                    <img src={row.image_url} alt="" />
                  ) : (
                    <span className="admin-cat-preview__fallback">{row.name.slice(0, 1)}</span>
                  )}
                </div>
              </td>
              <td>{row.name}</td>
              <td className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(row.id)
                    setEditSlug(row.slug)
                    setForm({
                      name: row.name,
                      icon: row.icon,
                      image_url: row.image_url,
                    })
                    setOpen(true)
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void api.admin.deleteCategory(row.id).then(load)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdminModal
        open={open}
        title={editId ? 'Edit category' : 'Add category'}
        onClose={closeModal}
      >
        <form className="admin-form admin-form--modal admin-form--grid" onSubmit={(e) => void onSubmit(e)}>
          <AdminField label="Name" full>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </AdminField>
          <AdminImageField
            value={form.image_url}
            onChange={(image_url) => setForm({ ...form, image_url })}
            label="Category image"
            variant="category"
          />
          <button type="submit" className="admin-btn">
            {editId ? 'Save changes' : 'Add category'}
          </button>
        </form>
      </AdminModal>
    </div>
  )
}
