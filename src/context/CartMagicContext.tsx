import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

interface CartMagicContextValue {
  launch: (from?: HTMLElement | null | { clientX: number; clientY: number }) => void
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  kind: 'bolt' | 'ball' | 'orb' | 'star' | 'glint'
  rot: number
  spin: number
}

const CartMagicContext = createContext<CartMagicContextValue | null>(null)

function getCartTarget() {
  return (
    document.querySelector<HTMLElement>('[data-cart-fly-target]') ||
    document.querySelector<HTMLElement>('.sticky-cart')
  )
}

function pointFrom(
  from?: HTMLElement | null | { clientX: number; clientY: number },
) {
  if (!from) {
    return { x: window.innerWidth / 2, y: window.innerHeight * 0.55 }
  }
  if ('clientX' in from) {
    return { x: from.clientX, y: from.clientY }
  }
  const r = from.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function bezier(t: number, p0: number, p1: number, p2: number, p3: number) {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
  alpha: number,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#f5d76e'
  ctx.beginPath()
  for (let i = 0; i < 5; i += 1) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const px = Math.cos(a) * r
    const py = Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function CartMagicProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const boltsRef = useRef<
    Array<{
      start: { x: number; y: number }
      c1: { x: number; y: number }
      c2: { x: number; y: number }
      end: { x: number; y: number }
      t: number
      speed: number
      lastEmit: number
    }>
  >([])
  const rafRef = useRef(0)
  const runningRef = useRef(false)

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  const tick = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    const bolts = boltsRef.current
    const particles = particlesRef.current

    for (let i = bolts.length - 1; i >= 0; i -= 1) {
      const bolt = bolts[i]
      bolt.t += bolt.speed
      const t = Math.min(1, bolt.t)
      const x = bezier(t, bolt.start.x, bolt.c1.x, bolt.c2.x, bolt.end.x)
      const y = bezier(t, bolt.start.y, bolt.c1.y, bolt.c2.y, bolt.end.y)

      // core
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14)
      g.addColorStop(0, 'rgba(255, 252, 230, 1)')
      g.addColorStop(0.35, 'rgba(245, 215, 110, 0.95)')
      g.addColorStop(0.7, 'rgba(212, 175, 55, 0.45)')
      g.addColorStop(1, 'rgba(212, 175, 55, 0)')
      ctx.beginPath()
      ctx.fillStyle = g
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()

      // soft trail smear
      ctx.beginPath()
      ctx.fillStyle = 'rgba(232, 197, 71, 0.18)'
      ctx.arc(x, y, 22, 0, Math.PI * 2)
      ctx.fill()

      if (t - bolt.lastEmit > 0.045) {
        bolt.lastEmit = t
        // few particles per emit only
        for (let n = 0; n < 3; n += 1) {
          const kinds: Particle['kind'][] = ['ball', 'orb', 'glint', 'star']
          const kind = kinds[(Math.random() * kinds.length) | 0]
          particles.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 1.6,
            vy: (Math.random() - 0.5) * 1.6 + 0.2,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.35,
            size:
              kind === 'orb'
                ? 5 + Math.random() * 5
                : kind === 'ball'
                  ? 2 + Math.random() * 3.5
                  : 3 + Math.random() * 3,
            kind,
            rot: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.2,
          })
        }
      }

      if (bolt.t >= 1) {
        // impact burst — capped
        for (let n = 0; n < 12; n += 1) {
          const ang = (Math.PI * 2 * n) / 12
          const spd = 1.2 + Math.random() * 2.2
          const kind: Particle['kind'] =
            n % 3 === 0 ? 'orb' : n % 2 === 0 ? 'ball' : 'star'
          particles.push({
            x,
            y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.3,
            size: kind === 'orb' ? 7 + Math.random() * 4 : 2.5 + Math.random() * 3,
            kind,
            rot: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.25,
          })
        }
        bolts.splice(i, 1)
      }
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i]
      p.life += 1 / 60
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.02
      p.rot += p.spin
      const a = Math.max(0, 1 - p.life / p.maxLife)
      if (a <= 0) {
        particles.splice(i, 1)
        continue
      }

      if (p.kind === 'star') {
        drawStar(ctx, p.x, p.y, p.size, p.rot, a)
      } else if (p.kind === 'orb') {
        ctx.beginPath()
        ctx.globalAlpha = a * 0.45
        ctx.fillStyle = 'rgba(255, 236, 170, 0.35)'
        ctx.strokeStyle = 'rgba(255, 236, 170, 0.4)'
        ctx.lineWidth = 1
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.globalAlpha = 1
      } else if (p.kind === 'ball') {
        const g = ctx.createRadialGradient(
          p.x - p.size * 0.3,
          p.y - p.size * 0.3,
          0,
          p.x,
          p.y,
          p.size,
        )
        g.addColorStop(0, `rgba(255, 248, 214, ${a})`)
        g.addColorStop(0.5, `rgba(232, 197, 71, ${a})`)
        g.addColorStop(1, `rgba(184, 134, 11, ${a * 0.85})`)
        ctx.beginPath()
        ctx.fillStyle = g
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.globalAlpha = a
        ctx.fillStyle = '#ffe566'
        ctx.shadowColor = 'rgba(232, 197, 71, 0.8)'
        ctx.shadowBlur = 6
        ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }
    }

    // hard cap to avoid hitching
    if (particles.length > 160) {
      particles.splice(0, particles.length - 160)
    }

    if (bolts.length || particles.length) {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      runningRef.current = false
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
  }, [])

  const startLoop = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const launch = useCallback(
    (from?: HTMLElement | null | { clientX: number; clientY: number }) => {
      const start = pointFrom(from)
      const target = getCartTarget()
      const end = target
        ? (() => {
            const r = target.getBoundingClientRect()
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          })()
        : { x: window.innerWidth - 48, y: window.innerHeight - 48 }

      // cast burst — limited
      for (let i = 0; i < 16; i += 1) {
        const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.2
        const spd = 1.5 + Math.random() * 2.8
        const kind: Particle['kind'] =
          i % 4 === 0 ? 'orb' : i % 3 === 0 ? 'star' : i % 2 === 0 ? 'ball' : 'glint'
        particlesRef.current.push({
          x: start.x,
          y: start.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.25,
          size: kind === 'orb' ? 6 + Math.random() * 5 : 2 + Math.random() * 3.5,
          kind,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.25,
        })
      }

      // two smooth bolts only
      for (let b = 0; b < 2; b += 1) {
        boltsRef.current.push({
          start: {
            x: start.x + (Math.random() - 0.5) * 10,
            y: start.y + (Math.random() - 0.5) * 8,
          },
          c1: {
            x: start.x + (end.x - start.x) * 0.28 + (b === 0 ? -30 : 30),
            y: start.y - 80 - Math.random() * 40,
          },
          c2: {
            x: start.x + (end.x - start.x) * 0.68 + (b === 0 ? 20 : -20),
            y: Math.min(start.y, end.y) - 30 - Math.random() * 30,
          },
          end,
          t: 0,
          speed: 0.016 + b * 0.002,
          lastEmit: -1,
        })
      }

      window.setTimeout(() => {
        target?.classList.add('cart-fly-pulse')
        window.setTimeout(() => target?.classList.remove('cart-fly-pulse'), 650)
      }, 900)

      startLoop()
    },
    [startLoop],
  )

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [resize])

  const value = useMemo(() => ({ launch }), [launch])

  return (
    <CartMagicContext.Provider value={value}>
      {children}
      <canvas ref={canvasRef} className="cart-magic-layer" aria-hidden />
    </CartMagicContext.Provider>
  )
}

export function useCartMagic() {
  const ctx = useContext(CartMagicContext)
  if (!ctx) throw new Error('useCartMagic must be used within CartMagicProvider')
  return ctx
}
