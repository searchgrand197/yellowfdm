import type { Category, MenuItem, Order, User } from '../types'

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
    request<{ razorpay_key: string; firebase: Record<string, string> }>('/config/'),
  getCategories: () => request<Category[]>('/categories/'),
  getItems: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request<MenuItem[]>(`/items/${qs ? `?${qs}` : ''}`)
  },
  getItem: (id: number | string) => request<MenuItem>(`/items/${id}/`),
  me: () => request<User | { user: null }>('/auth/me/'),
  firebaseLogin: (phone: string, name?: string) =>
    request<User & { phone?: string }>('/auth/firebase/', {
      method: 'POST',
      body: JSON.stringify({ username: phone, provider: 'phone', name }),
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
    cart_items: Array<{ menu_item_id: number; quantity: number; topping_ids?: number[] }>
  }) =>
    request<Order>('/orders/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getOrders: () => request<Order[]>('/orders/'),
  initiatePayment: (amount: number, orderId: number | string) =>
    request<{ id: string; order_id: string; amount: string; currency: string; key: string }>(
      '/payments/initiate/',
      {
        method: 'POST',
        body: JSON.stringify({ amount, order_id: String(orderId) }),
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
}
