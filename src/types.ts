export interface Category {
  id: number
  name: string
  slug: string
  icon: string
  image_url: string
  sort_order: number
}

export interface Topping {
  id: number
  name: string
  price: string
  available: boolean
}

export interface MenuItem {
  id: number
  name: string
  subtitle: string
  description: string
  price: string
  original_price: string | null
  image_url: string
  delivery_mins: string
  free_delivery: boolean
  rating: string
  review_count: number
  is_popular: boolean
  is_featured: boolean
  promo_label: string
  category: number
  category_name: string
  category_slug: string
  is_favorite: boolean
  toppings: Topping[]
}

export interface CartLine {
  key: string
  item: MenuItem
  quantity: number
  toppings: Topping[]
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
}

export interface Order {
  id: number
  guest_name: string
  guest_phone: string
  address: string
  status: string
  total: string
  notes: string
  payment_status?: string
  razorpay_order_id?: string
  payment_id?: string
  created_at: string
  items: Array<{
    id: number
    menu_item: number
    name: string
    image_url: string
    quantity: number
    unit_price: string
    line_total: string
    toppings_text?: string
  }>
}

export function cartLineKey(itemId: number, toppings: Topping[] = []) {
  const ids = [...toppings.map((t) => t.id)].sort((a, b) => a - b).join('-')
  return `${itemId}:${ids || 'plain'}`
}

export function lineUnitPrice(item: MenuItem, toppings: Topping[] = []) {
  const extra = toppings.reduce((sum, t) => sum + Number(t.price), 0)
  return Number(item.price) + extra
}
