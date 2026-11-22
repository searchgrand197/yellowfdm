import type { Category } from '../types'
import { hasNoBackground } from '../utils/images'

export function CategoryScroller({
  categories,
  active,
  onSelect,
}: {
  categories: Category[]
  active: string
  onSelect: (slug: string) => void
}) {
  return (
    <div className="category-row" role="tablist" aria-label="Food categories">
      {categories.map((cat) => {
        const showImage = Boolean(cat.image_url && hasNoBackground(cat.image_url))
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active === cat.slug}
            className={`category-chip${active === cat.slug ? ' active' : ''}`}
            onClick={() => onSelect(cat.slug)}
          >
            <span className="category-visual">
              <span className="category-blob" aria-hidden />
              {showImage ? (
                <img src={cat.image_url} alt="" className="category-photo" />
              ) : (
                <span className="category-fallback">{cat.name.slice(0, 1)}</span>
              )}
            </span>
            <span>{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}
