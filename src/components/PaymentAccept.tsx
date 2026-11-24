const METHODS: Array<{ id: string; label: string; src?: string; kind?: 'cash' | 'paytm' | 'upi' }> = [
  { id: 'cash', label: 'Cash', kind: 'cash' },
  { id: 'mastercard', label: 'Mastercard', src: '/payments/mastercard.png' },
  { id: 'gpay', label: 'Google Pay', src: '/payments/gpay.png' },
  { id: 'phonepe', label: 'PhonePe', src: '/payments/phonepe.png' },
  { id: 'visa', label: 'Visa', src: '/payments/visa.png' },
  { id: 'upi', label: 'UPI', kind: 'upi' },
]

export function PaymentAccept() {
  return (
    <section className="pay-accept" aria-label="Payment methods we accept">
      <p className="pay-accept__title">We accept</p>
      <ul className="pay-accept__grid">
        {METHODS.map((m) => (
          <li key={m.id} className="pay-accept__chip" title={m.label}>
            {m.src ? (
              <img src={m.src} alt="" className="pay-accept__logo" />
            ) : m.kind === 'cash' ? (
              <span className="pay-accept__cash" aria-hidden>
                ₹CASH
              </span>
            ) : (
              <span className="pay-accept__upi" aria-hidden>
                <svg viewBox="0 0 20 20" width="14" height="14">
                  <path d="M4 14 L10 4 L10 10 Z" fill="#097939" />
                  <path d="M16 6 L10 16 L10 10 Z" fill="#ed752f" />
                </svg>
                UPI
              </span>
            )}
            <span className="sr-only">{m.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
