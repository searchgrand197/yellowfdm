export function formatMoney(value: string | number) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return '₹0'
  return `₹${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`
}

export function formatReviewCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k+`
  if (count > 0) return `${count}+`
  return 'New'
}
