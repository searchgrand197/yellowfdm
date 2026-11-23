import { useEffect, useRef } from 'react'

type Piece = {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  rot: number
  vr: number
  color: string
  life: number
  shape: 0 | 1 | 2
}

const COLORS = ['#ffcc33', '#f5b800', '#ffe082', '#121212', '#ffffff', '#ff6b6b', '#4ade80']

export function CouponConfetti({ burstKey }: { burstKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const piecesRef = useRef<Piece[]>([])
  const rafRef = useRef(0)

  useEffect(() => {
    if (!burstKey) return
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const w = parent.clientWidth
    const h = parent.clientHeight
    const cx = w * 0.5
    const cy = h * 0.28
    const next: Piece[] = []
    for (let i = 0; i < 110; i += 1) {
      const angle = (Math.PI * 2 * i) / 110 + (Math.random() - 0.5) * 0.4
      const speed = 4 + Math.random() * 9
      next.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 20,
        w: 5 + Math.random() * 7,
        h: 3 + Math.random() * 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: COLORS[i % COLORS.length],
        life: 1,
        shape: (i % 3) as 0 | 1 | 2,
      })
    }
    piecesRef.current = next

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const tick = () => {
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      ctx.clearRect(0, 0, pw, ph)
      const pieces = piecesRef.current
      for (let i = pieces.length - 1; i >= 0; i -= 1) {
        const p = pieces[i]
        p.vy += 0.22
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.life -= 0.012
        if (p.life <= 0 || p.y > ph + 40) {
          pieces.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 0) {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        } else if (p.shape === 1) {
          ctx.beginPath()
          ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          ctx.moveTo(0, -p.h)
          ctx.lineTo(p.w / 2, p.h / 2)
          ctx.lineTo(-p.w / 2, p.h / 2)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
      if (pieces.length) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, pw, ph)
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      piecesRef.current = []
    }
  }, [burstKey])

  return <canvas ref={canvasRef} className="coupon-confetti" aria-hidden />
}
