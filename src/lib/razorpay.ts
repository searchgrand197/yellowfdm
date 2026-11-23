export type RazorpaySuccessResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  key: string
  amount: string | number
  currency: string
  name: string
  description?: string
  order_id: string
  prefill?: { name?: string; contact?: string }
  theme?: { color?: string }
  handler: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void }
}

type RazorpayInstance = {
  open: () => void
  on: (event: string, cb: (resp: { error?: { description?: string; reason?: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function openRazorpayCheckout(options: RazorpayOptions) {
  const ok = await loadRazorpayScript()
  if (!ok || !window.Razorpay) {
    throw new Error('Could not load Razorpay')
  }
  if (!options.key?.trim()) {
    throw new Error('Missing Razorpay key')
  }

  const rzp = new window.Razorpay({
    ...options,
    amount: Number(options.amount),
  })

  rzp.on('payment.failed', (resp) => {
    const desc = resp?.error?.description || resp?.error?.reason || 'Payment failed'
    window.setTimeout(() => {
      options.modal?.ondismiss?.()
    }, 0)
    console.error('Razorpay payment failed:', desc)
  })

  rzp.open()
}
