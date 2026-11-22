import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useWallet } from '../context/WalletContext'
import { formatMoney } from '../utils/money'

export function ScratchCard() {
  const { scratched, claimScratch, markScratched, saveCoupon } = useWallet()
  const [open, setOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [reward, setReward] = useState<{ code: string; amount: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scratching = useRef(false)
  const claimedRef = useRef(false)

  useEffect(() => {
    if (scratched) return
    const t = window.setTimeout(() => setOpen(true), 800)
    return () => window.clearTimeout(t)
  }, [scratched])

  useEffect(() => {
    if (!open || revealed) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#ffd54f')
    grad.addColorStop(0.5, '#ffcc33')
    grad.addColorStop(1, '#f5b800')
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(18,18,18,0.78)'
    ctx.font = '700 22px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Scratch here', w / 2, h / 2 - 8)
    ctx.font = '600 14px Outfit, sans-serif'
    ctx.fillText('First-time reward', w / 2, h / 2 + 18)
  }, [open, revealed])

  const finishReveal = async () => {
    if (claimedRef.current) return
    claimedRef.current = true
    setRevealed(true)
    try {
      const data = await claimScratch()
      setReward({ code: data.reward_code, amount: data.reward_amount })
    } catch {
      const fallback = { code: 'FIRST TIME USER', amount: 50 }
      setReward(fallback)
      saveCoupon(fallback.code)
      markScratched()
    }
  }

  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || revealed) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 24, 0, Math.PI * 2)
    ctx.fill()

    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let cleared = 0
    for (let i = 3; i < sample.length; i += 4) {
      if (sample[i] === 0) cleared += 1
    }
    if (cleared / (canvas.width * canvas.height) > 0.42) {
      void finishReveal()
    }
  }

  const pointerPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    }
  }

  if (!open) return null

  return (
    <div className="scratch-overlay" role="dialog" aria-label="First time coupon">
      <div className="scratch-modal">
        <p className="brand-mark">Foodporium</p>
        <h2>First-time treat</h2>
        <p className="muted">Scratch the card to unlock your welcome reward.</p>

        <div className="scratch-stage">
          <div className="scratch-prize">
            <strong>{formatMoney(reward?.amount ?? 50)}</strong>
            <span>added to wallet</span>
            <em>{reward?.code ?? 'FIRST TIME USER'}</em>
          </div>
          {!revealed && (
            <canvas
              ref={canvasRef}
              width={320}
              height={180}
              className="scratch-canvas"
              onPointerDown={(e) => {
                scratching.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                const { x, y } = pointerPos(e)
                scratchAt(x, y)
              }}
              onPointerMove={(e) => {
                if (!scratching.current) return
                const { x, y } = pointerPos(e)
                scratchAt(x, y)
              }}
              onPointerUp={() => {
                scratching.current = false
              }}
            />
          )}
        </div>

        {revealed && reward && (
          <p className="scratch-success">
            You got {formatMoney(reward.amount)} in wallet + coupon <strong>{reward.code}</strong>
          </p>
        )}

        <button
          type="button"
          className="btn btn-dark grow"
          onClick={() => {
            if (revealed) markScratched()
            setOpen(false)
          }}
        >
          {revealed ? 'Awesome' : 'Maybe later'}
        </button>
      </div>
    </div>
  )
}
