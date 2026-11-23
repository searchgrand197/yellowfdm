import { useEffect, useRef } from 'react'
import { api } from '../api/client'

/** Poll for new pending orders and buzz the laptop until acknowledged. */
export function useOrderBuzz(enabled: boolean, onNew: (ids: number[]) => void) {
  const sinceRef = useRef(new Date().toISOString())
  const seenRef = useRef<Set<number>>(new Set())
  const audioRef = useRef<AudioContext | null>(null)
  const buzzTimer = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let primed = false

    const stopBuzz = () => {
      window.clearInterval(buzzTimer.current)
      buzzTimer.current = 0
    }

    const beep = () => {
      try {
        const ctx = audioRef.current || new AudioContext()
        audioRef.current = ctx
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = 880
        gain.gain.value = 0.08
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.18)
      } catch {
        /* ignore autoplay blocks until user gesture */
      }
    }

    const startBuzz = () => {
      if (buzzTimer.current) return
      beep()
      buzzTimer.current = window.setInterval(beep, 900)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Foodporium', { body: 'New paid order' })
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    }

    const tick = async () => {
      try {
        const data = await api.admin.newOrders(sinceRef.current)
        if (!primed) {
          data.orders.forEach((o) => seenRef.current.add(o.id))
          primed = true
          sinceRef.current = new Date().toISOString()
          return
        }
        const fresh = data.orders.filter((o) => !seenRef.current.has(o.id))
        if (fresh.length) {
          fresh.forEach((o) => seenRef.current.add(o.id))
          onNew(fresh.map((o) => o.id))
          startBuzz()
        }
        sinceRef.current = new Date().toISOString()
      } catch {
        /* ignore */
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), 5000)
    const stopOnFocus = () => stopBuzz()
    window.addEventListener('focus', stopOnFocus)
    window.addEventListener('pointerdown', stopOnFocus)

    return () => {
      window.clearInterval(id)
      stopBuzz()
      window.removeEventListener('focus', stopOnFocus)
      window.removeEventListener('pointerdown', stopOnFocus)
    }
  }, [enabled, onNew])
}
