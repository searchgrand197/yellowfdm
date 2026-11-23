import { ImagePlus, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { api } from '../api/client'

type Props = {
  value: string
  onChange: (url: string) => void
  required?: boolean
  label?: string
  /** Match homepage cutout style (contain + soft blob). */
  variant?: 'default' | 'category' | 'product'
}

export function AdminImageField({
  value,
  onChange,
  required,
  label = 'Image',
  variant = 'default',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { url } = await api.admin.uploadImage(file)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const previewClass =
    variant === 'category'
      ? 'admin-image-field__preview admin-image-field__preview--category'
      : variant === 'product'
        ? 'admin-image-field__preview admin-image-field__preview--product'
        : 'admin-image-field__preview admin-image-field__preview--product'

  return (
    <div className="admin-image-field">
      <span className="admin-image-field__label">
        {label}
        {required ? ' *' : ''}
      </span>
      <div className="admin-image-field__row">
        {variant === 'category' ? (
          <div className="admin-cat-preview admin-cat-preview--lg">
            <span className="admin-cat-preview__blob" aria-hidden />
            {value ? (
              <img src={value} alt="" />
            ) : (
              <span className="admin-cat-preview__fallback">?</span>
            )}
          </div>
        ) : value ? (
          <div className="admin-image-field__stage">
            <img src={value} alt="" className={previewClass} />
          </div>
        ) : (
          <div className="admin-image-field__placeholder">No image</div>
        )}
        <div className="admin-image-field__actions">
          <button
            type="button"
            className="admin-btn ghost"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </button>
          {value ? (
            <button type="button" className="admin-btn ghost" onClick={() => onChange('')}>
              Clear
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <input
            type="text"
            value={value}
            required={required}
            readOnly
            tabIndex={-1}
            aria-hidden
            className="admin-image-field__hidden"
          />
        </div>
      </div>
      <p className="admin-image-field__hint">
        Use a PNG with transparent background — same look as the homepage.
      </p>
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  )
}
