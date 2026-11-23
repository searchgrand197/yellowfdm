import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export type MorphImage = { src: string; alt?: string }

export type MorphSlide =
  | { type: 'text'; value: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'random-image'; pool: MorphImage[] }

type ConcreteSlide =
  | { type: 'text'; value: string }
  | { type: 'image'; src: string; alt?: string }

const DEFAULT_SLIDES: MorphSlide[] = [
  { type: 'text', value: 'Beat' },
  { type: 'text', value: 'the' },
  { type: 'text', value: 'hunger' },
]

const MORPH_TIME = 1
const COOLDOWN_TIME = 0.45

function pickRandomImage(pool: MorphImage[], excludeSrc?: string): MorphImage {
  if (!pool.length) return { src: '', alt: '' }
  if (pool.length === 1) return pool[0]
  const options = excludeSrc ? pool.filter((img) => img.src !== excludeSrc) : pool
  return options[Math.floor(Math.random() * options.length)] || pool[0]
}

function fillSlot(slot: HTMLSpanElement, slide: ConcreteSlide) {
  slot.replaceChildren()
  if (slide.type === 'text') {
    slot.classList.remove('is-image')
    slot.textContent = slide.value
    return
  }
  slot.classList.add('is-image')
  const img = document.createElement('img')
  img.src = slide.src
  img.alt = slide.alt || ''
  img.draggable = false
  slot.appendChild(img)
}

export function MorphingText({
  words,
  slides,
  showNext = true,
  nextLabel = 'Next',
  nextDisabled = false,
  onNext,
}: {
  words?: string[]
  slides?: MorphSlide[]
  showNext?: boolean
  nextLabel?: string
  nextDisabled?: boolean
  /** When set, Next runs this instead of advancing the morph animation. */
  onNext?: () => void
}) {
  const text1Ref = useRef<HTMLSpanElement | null>(null)
  const text2Ref = useRef<HTMLSpanElement | null>(null)
  const nextRef = useRef<(() => void) | null>(null)
  const [gooey, setGooey] = useState(true)

  const resolvedSlides = useMemo<MorphSlide[]>(
    () =>
      slides ??
      (words ? words.map((value) => ({ type: 'text' as const, value })) : DEFAULT_SLIDES),
    [slides, words],
  )

  useEffect(() => {
    const text1 = text1Ref.current
    const text2 = text2Ref.current
    if (!text1 || !text2 || resolvedSlides.length === 0) return

    const n = resolvedSlides.length
    let textIndex = n - 1
    let time = performance.now()
    let morph = 0
    let cooldown = COOLDOWN_TIME
    let raf = 0
    let lastImageSrc = ''
    /** Keep random-image picks stable for the whole Beat→…→image cycle. */
    const lockedImages = new Map<number, MorphImage>()

    const resolveAt = (index: number): ConcreteSlide => {
      const i = ((index % n) + n) % n
      const raw = resolvedSlides[i]
      if (raw.type === 'text') return raw
      if (raw.type === 'image') return raw

      const existing = lockedImages.get(i)
      if (existing) return { type: 'image', src: existing.src, alt: existing.alt }

      const picked = pickRandomImage(raw.pool, lastImageSrc)
      lockedImages.set(i, picked)
      lastImageSrc = picked.src
      return { type: 'image', src: picked.src, alt: picked.alt }
    }

    const syncSlots = () => {
      const current = resolveAt(textIndex)
      const upcoming = resolveAt(textIndex + 1)
      fillSlot(text1, current)
      fillSlot(text2, upcoming)
      setGooey(current.type === 'text' && upcoming.type === 'text')

      // Only one image in the DOM when the other slot is text — already true.
      // When leaving an image slide, free it so the next loop can pick a new one.
      const curIdx = ((textIndex % n) + n) % n
      const nextIdx = ((textIndex + 1) % n + n) % n
      for (const key of [...lockedImages.keys()]) {
        if (key !== curIdx && key !== nextIdx) lockedImages.delete(key)
      }
    }

    const setMorph = (fraction: number) => {
      const f = Math.max(0.0001, Math.min(fraction, 1))
      text2.style.filter = `blur(${Math.min(8 / f - 8, 100)}px)`
      text2.style.opacity = `${Math.pow(f, 0.4)}`

      const inv = Math.max(0.0001, 1 - f)
      text1.style.filter = `blur(${Math.min(8 / inv - 8, 100)}px)`
      text1.style.opacity = `${Math.pow(inv, 0.4)}`
    }

    const doCooldown = () => {
      morph = 0
      text2.style.filter = 'none'
      text2.style.opacity = '1'
      text1.style.filter = 'none'
      text1.style.opacity = '0'
    }

    const doMorph = () => {
      morph -= cooldown
      cooldown = 0
      let fraction = morph / MORPH_TIME
      if (fraction > 1) {
        cooldown = COOLDOWN_TIME
        fraction = 1
      }
      setMorph(fraction)
    }

    nextRef.current = () => {
      cooldown = 0
      morph = Math.max(morph, MORPH_TIME * 0.92)
    }

    syncSlots()
    doCooldown()

    const animate = (now: number) => {
      const shouldIncrementIndex = cooldown > 0
      const dt = (now - time) / 1000
      time = now
      cooldown -= dt

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex += 1
          syncSlots()
        }
        doMorph()
      } else {
        doCooldown()
      }

      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(raf)
      nextRef.current = null
    }
  }, [resolvedSlides])

  return (
    <div className="morph-text">
      <div className={`morph-text__container${gooey ? ' morph-text__container--gooey' : ''}`}>
        <span ref={text1Ref} className="morph-text__word" />
        <span ref={text2Ref} className="morph-text__word" />
      </div>

      {showNext && (
        <button
          type="button"
          className="morph-text__next"
          aria-label={nextLabel}
          disabled={nextDisabled}
          onClick={() => {
            if (onNext) onNext()
            else nextRef.current?.()
          }}
        >
          {nextLabel}
          <ArrowRight size={18} strokeWidth={2.6} />
        </button>
      )}

      <svg className="morph-text__filters" aria-hidden focusable="false">
        <defs>
          <filter id="morph-threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
