/** Tiny food glyph for a topping name. */
export function toppingIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('tomato')) return '🍅'
  if (n.includes('onion')) return '🧅'
  if (n.includes('capsicum') || n.includes('bell')) return '🫑'
  if (n.includes('corn')) return '🌽'
  if (n.includes('jalapeno') || n.includes('jalapeño') || n.includes('paprika')) return '🌶️'
  if (n.includes('olive')) return '🫒'
  if (n.includes('mushroom')) return '🍄'
  if (n.includes('paneer')) return '🧈'
  if (n.includes('cheese')) return '🧀'
  if (n.includes('pepperoni')) return '🍕'
  if (n.includes('chicken')) return '🍗'
  if (n.includes('veg')) return '🥬'
  return '🥗'
}

/** Drop "(Small|Medium|Large)" — size already matches the product. */
export function toppingLabel(name: string): string {
  return name.replace(/\s*\((?:small|medium|large)(?:\s*size)?\)\s*$/i, '').trim() || name
}
