import type {
  Category,
  Combo,
  Coupon,
  MenuItem,
  Order,
  ShopSettings,
  Topping,
  User,
} from '../types'

const API = '/api'

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const csrf = getCookie('csrftoken')
  if (csrf) headers.set('X-CSRFToken', csrf)

  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = 'Something went wrong'
    try {
      const data = await res.json()
      message =
        data.detail ||
        data.error ||
        data.message ||
        (typeof data === 'object' ? JSON.stringify(data) : null) ||
        data.non_field_errors?.[0] ||
        message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  getConfig: () =>
    request<{
      razorpay_key: string
      firebase: Record<string, string>
      shop: ShopSettings
    }>('/config/'),
  getCategories: () => request<Category[]>('/categories/'),
  getItems: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request<MenuItem[]>(`/items/${qs ? `?${qs}` : ''}`)
  },
  getItem: (id: number | string) => request<MenuItem>(`/items/${id}/`),
  getCombos: () => request<Combo[]>('/combos/'),
  getCoupons: () => request<Coupon[]>('/coupons/'),
  me: () => request<User | { user: null }>('/auth/me/'),
  login: (username: string, password: string) =>
    request<User>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  firebaseLogin: (phone: string, name?: string) =>
    request<User & { phone?: string }>('/auth/firebase/', {
      method: 'POST',
      body: JSON.stringify({ username: phone, provider: 'phone', name }),
    }),
  sendOtp: (phone: string) =>
    request<{ ok: boolean; phone: string; message: string; expires_in: number; dev_otp?: string }>(
      '/auth/otp/send/',
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
      },
    ),
  verifyOtp: (phone: string, otp: string, name?: string) =>
    request<User & { phone?: string }>('/auth/otp/verify/', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, name }),
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout/', { method: 'POST' }),
  getFavorites: () => request<MenuItem[]>('/favorites/'),
  addFavorite: (id: number) =>
    request<{ favorited: boolean }>(`/favorites/${id}/`, { method: 'POST' }),
  removeFavorite: (id: number) =>
    request<{ favorited: boolean }>(`/favorites/${id}/`, { method: 'DELETE' }),
  placeOrder: (payload: {
    guest_name: string
    guest_phone: string
    address: string
    notes?: string
    coupon_code?: string
    cart_items: Array<{ menu_item_id: number; quantity: number; topping_ids?: number[] }>
  }) =>
    request<Order>('/orders/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getOrders: () => request<Order[]>('/orders/'),
  initiatePayment: (amount: number, orderId: number | string) =>
    request<{ id: string; order_id: string; amount: number | string; currency: string; key: string }>(
      '/payments/initiate/',
      {
        method: 'POST',
        body: JSON.stringify({ amount: Math.round(Number(amount)), order_id: String(orderId) }),
      },
    ),
  verifyPayment: (payload: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    order_id: number | string
  }) =>
    request<{ status: string; payment_id: string }>('/payments/verify/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getWallet: (phone: string) =>
    request<{ phone: string; balance: string }>(`/wallet/?phone=${encodeURIComponent(phone)}`),
  walletAction: (phone: string, action: 'topup' | 'debit', amount: number) =>
    request<{ phone: string; balance: string }>('/wallet/', {
      method: 'POST',
      body: JSON.stringify({ phone, action, amount }),
    }),
  claimScratch: (clientKey: string, phone?: string) =>
    request<{
      claimed: boolean
      reward_code: string
      reward_amount: string
      wallet_balance?: string | null
      message?: string
    }>('/scratch/', {
      method: 'POST',
      body: JSON.stringify({ client_key: clientKey, phone }),
    }),
  payWithWallet: (orderId: number | string, phone: string, amount: number) =>
    request<{
      status: string
      wallet_balance: string
      wallet_used: string
      payment_status: string
    }>('/payments/wallet/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, phone, amount }),
    }),

  admin: {
    listOrders: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString()
      return request<Order[]>(`/admin/orders/${qs ? `?${qs}` : ''}`)
    },
    updateOrderStatus: (id: number, status: string) =>
      request<Order>(`/admin/orders/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    newOrders: (since?: string) => {
      const qs = since ? `?since=${encodeURIComponent(since)}` : ''
      return request<{ count: number; orders: Array<{ id: number; created_at: string }> }>(
        `/admin/orders/new/${qs}`,
      )
    },
    listCategories: () => request<Category[]>('/admin/categories/'),
    saveCategory: (data: Partial<Category> & { name: string; slug: string }, id?: number) =>
      request<Category>(id ? `/admin/categories/${id}/` : '/admin/categories/', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      }),
    deleteCategory: (id: number) =>
      request<void>(`/admin/categories/${id}/`, { method: 'DELETE' }),
    reorderCategories: (ids: number[]) =>
      request<{ ok: boolean }>('/admin/categories/reorder/', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    listItems: () => request<MenuItem[]>('/admin/items/'),
    saveItem: (data: Record<string, unknown>, id?: number) =>
      request<MenuItem>(id ? `/admin/items/${id}/` : '/admin/items/', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      }),
    deleteItem: (id: number) => request<void>(`/admin/items/${id}/`, { method: 'DELETE' }),
    reorderItems: (ids: number[]) =>
      request<{ ok: boolean }>('/admin/items/reorder/', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    listToppings: () => request<Topping[]>('/admin/toppings/'),
    saveTopping: (data: Partial<Topping> & { name: string }, id?: number) =>
      request<Topping>(id ? `/admin/toppings/${id}/` : '/admin/toppings/', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      }),
    deleteTopping: (id: number) =>
      request<void>(`/admin/toppings/${id}/`, { method: 'DELETE' }),
    listCoupons: () => request<Coupon[]>('/admin/coupons/'),
    saveCoupon: (data: Record<string, unknown>, id?: number) =>
      request<Coupon>(id ? `/admin/coupons/${id}/` : '/admin/coupons/', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      }),
    deleteCoupon: (id: number) =>
      request<void>(`/admin/coupons/${id}/`, { method: 'DELETE' }),
    listCombos: () => request<Combo[]>('/admin/combos/'),
    saveCombo: (data: Record<string, unknown>, id?: number) =>
      request<Combo>(id ? `/admin/combos/${id}/` : '/admin/combos/', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data),
      }),
    deleteCombo: (id: number) =>
      request<void>(`/admin/combos/${id}/`, { method: 'DELETE' }),
    reorderCombos: (ids: number[]) =>
      request<{ ok: boolean }>('/admin/combos/reorder/', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    getShop: () => request<ShopSettings>('/admin/shop/'),
    updateShop: (data: Partial<ShopSettings>) =>
      request<ShopSettings>('/admin/shop/', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    uploadImage: async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      const headers = new Headers()
      const csrf = getCookie('csrftoken')
      if (csrf) headers.set('X-CSRFToken', csrf)
      const res = await fetch(`${API}/admin/upload/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body,
      })
      if (!res.ok) {
        let message = 'Upload failed'
        try {
          const data = await res.json()
          message = data.error || data.detail || message
        } catch {
          /* ignore */
        }
        throw new Error(message)
      }
      return res.json() as Promise<{ url: string }>
    },
  },
}
