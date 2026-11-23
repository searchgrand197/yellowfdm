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
  available?: boolean
  promo_label: string
  sort_order?: number
  category: number
  category_name: string
  category_slug: string
  is_favorite: boolean
  toppings: Topping[]
}

export interface Coupon {
  id: number
  code: string
  amount: string
  min_order_value?: string
  one_time?: boolean
  active: boolean
  expires_at: string | null
  max_uses: number | null
  used_count: number
  created_at?: string
}

export interface Combo {
  id: number
  name: string
  badge: string
  item_a: number
  item_b: number
  item_c?: number | null
  item_d?: number | null
  item_a_name: string
  item_b_name: string
  item_c_name?: string | null
  item_d_name?: string | null
  item_a_image: string
  item_b_image: string
  item_c_image?: string | null
  item_d_image?: string | null
  item_ids?: number[]
  item_names?: string[]
  actual_price?: string
  price: string
  save_amount: string
  sort_order: number
  active: boolean
  image_url: string
}

export interface ShopSettings {
  is_open: boolean
  reopens_at: string | null
  opens_at?: string | null
  closes_at?: string | null
  closed_message: string
  updated_at?: string
  manual_open?: boolean
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
  is_staff?: boolean
}

export interface Order {
  id: number
  guest_name: string
  guest_phone: string
  address: string
  status: string
  total: string
  notes: string
  coupon_code?: string
  discount?: string
  payment_status?: string
  razorpay_order_id?: string
  payment_id?: string
  wallet_used?: string
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
