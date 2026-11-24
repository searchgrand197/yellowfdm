import type { MenuItem } from '../types'

export type PizzaSize = 'S' | 'M' | 'L'

const SIZE_LABEL: Record<PizzaSize, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
}

export function pizzaSizeLabel(size: PizzaSize) {
  return SIZE_LABEL[size]
}

/** Normalize a pizza name to a shared key across S/M/L products. */
export function pizzaBaseKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(small|medium|large|size|pizza)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function detectPizzaSize(item: MenuItem): PizzaSize | null {
  const slug = (item.category_slug || '').toLowerCase()
  const name = item.name.toLowerCase()
  if (/\(\s*large\s*\)/.test(name) || /\blarge\b/.test(name) || slug === 'pizza-premium-l') {
    return 'L'
  }
  if (/\(\s*medium\s*\)/.test(name) || /\bmedium\b/.test(name) || slug === 'pizza-premium-m') {
    return 'M'
  }
  if (
    /\(\s*small\s*\)/.test(name) ||
    /\bsmall\b/.test(name) ||
    slug === 'pizza' ||
    slug === 'pizza-premium' ||
    slug.startsWith('pizza')
  ) {
    return 'S'
  }
  return null
}

export function isPizzaItem(item: MenuItem): boolean {
  const slug = (item.category_slug || '').toLowerCase()
  return slug.startsWith('pizza') || /\bpizza\b/i.test(item.name)
}

export type PizzaVariantMap = Map<string, Partial<Record<PizzaSize, MenuItem>>>

export function buildPizzaVariantMap(items: MenuItem[]): PizzaVariantMap {
  const map: PizzaVariantMap = new Map()
  for (const item of items) {
    if (!isPizzaItem(item)) continue
    const size = detectPizzaSize(item)
    if (!size) continue
    const key = pizzaBaseKey(item.name)
    if (!key) continue
    const row = map.get(key) || {}
    // Prefer keeping first, or replace if empty
    if (!row[size]) row[size] = item
    map.set(key, row)
  }
  return map
}

/** One card per pizza flavor — keep the item from the current list when possible. */
export function dedupePizzaItems(items: MenuItem[], map: PizzaVariantMap): MenuItem[] {
  const seen = new Set<string>()
  const out: MenuItem[] = []
  for (const item of items) {
    if (!isPizzaItem(item)) {
      out.push(item)
      continue
    }
    const key = pizzaBaseKey(item.name)
    const variants = map.get(key)
    if (!variants || Object.keys(variants).length <= 1) {
      out.push(item)
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function displayPizzaName(name: string): string {
  const cleaned = name
    .replace(/\s*\((?:small|medium|large)(?:\s*size)?\)\s*/gi, ' ')
    .replace(/\b(small|medium|large)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || name
}
