import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import line1Svg from '@/assets/intro/line1.svg?raw'
import line2Svg from '@/assets/intro/line2.svg?raw'

const FILL = '#FC9C02'
const LINE_MS = 2000
const DRAW_MS = LINE_MS * 2
const FADE_MS = 520
const PULSE_MS = 2200
const AUDIO_VOL = 0.75
const AUDIO_SRC = '/audio/shankh.mp3'

type Phase = 'draw' | 'pulse' | 'fade'

// Module singleton — survives React Strict Mode remount (which would otherwise pause audio).
let sharedShankh: HTMLAudioElement | null = null

function getShankhAudio() {
  if (!sharedShankh) {
    const a = new Audio(AUDIO_SRC)
    a.preload = 'auto'
    a.volume = AUDIO_VOL
    a.setAttribute('playsinline', 'true')
    // iOS Safari
    ;(a as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    sharedShankh = a
  }
  return sharedShankh
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function prepareSvg(raw: string) {
  return raw
    .replace(/stroke="[^"]*"/g, '')
    .replace(/fill="[^"]*"/g, `fill="${FILL}"`)
}

type Glyph = { el: SVGPathElement; weight: number }

/** Left→right paths with complexity weights (path length). */
function prepLine(host: HTMLDivElement, raw: string): Glyph[] {
  host.innerHTML = prepareSvg(raw)
  const svg = host.querySelector('svg')
  if (!svg) return []
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.style.display = 'block'
  svg.style.overflow = 'visible'

  const paths = [...svg.querySelectorAll('path')]
  paths.sort((a, b) => a.getBBox().x - b.getBBox().x)

  return paths.map((el) => {
    let weight = 40
    try { weight = Math.max(24, el.getTotalLength()) }
    catch { /* keep floor */ }
    el.style.fill = FILL
    el.style.stroke = 'none'
    el.style.opacity = '0'
    return { el, weight }
  })
}

function paintLine(glyphs: Glyph[], localT: number) {
  const total = glyphs.reduce((s, g) => s + g.weight, 0) || 1
  let cursor = 0
  for (const g of glyphs) {
    const start = cursor / total
    const end = (cursor + g.weight) / total
    cursor += g.weight
    const local = Math.max(0, Math.min(1, (localT - start) / (end - start || 1)))
    g.el.style.opacity = String(easeInOut(local))
  }
}

function ShlokaLine({
  raw, glyphsRef, width, height,
}: {
  raw: string
  glyphsRef: React.MutableRefObject<Glyph[]>
  width: number
  height: number
}) {
  const host = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = host.current
    if (!root) return
    glyphsRef.current = prepLine(root, raw)
    return () => { glyphsRef.current = [] }
  }, [raw, glyphsRef])

  return (
    <div
      ref={host}
      className="w-full"
      style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
      aria-hidden
    />
  )
}

/**
 * Fill-only letter fade: line1 L→R (2s), line2 L→R (2s).
 * Then pulse until `ready` (fonts + catalogue). Cover thumbs keep loading under home.
 * Fade out → onDone.
 * Shankh audio (~4.5s, baked fade in/out) plays at 75% during the draw.
 */
export default function ShlokaIntro({
  ready,
  onDone,
}: {
  ready: boolean
  onDone: () => void
}) {
  const line1Ref = useRef<Glyph[]>([])
  const line2Ref = useRef<Glyph[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [phase, setPhase] = useState<Phase>('draw')
  const [overlayOpacity, setOverlayOpacity] = useState(1)
  const [needsTap, setNeedsTap] = useState(false)
  const doneRef = useRef(false)
  const readyRef = useRef(ready)
  readyRef.current = ready

  // Start shankh: try autoplay; if blocked, unlock on first tap (common on mobile).
  useEffect(() => {
    const audio = getShankhAudio()
    audio.volume = AUDIO_VOL
    try { audio.currentTime = 0 } catch { /* ignore */ }
    audioRef.current = audio

    let unlocked = false
    const tryPlay = () => {
      const p = audio.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          unlocked = true
          setNeedsTap(false)
        }).catch(() => {
          if (!unlocked) setNeedsTap(true)
        })
      }
    }

    tryPlay()

    const unlock = () => {
      tryPlay()
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('touchstart', unlock, { passive: true })
    window.addEventListener('keydown', unlock)

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
      // Do not pause here — Strict Mode remount would kill the sound mid-intro.
    }
  }, [])

  // Draw: fixed 4s, complexity-weighted per glyph
  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - t0
      if (elapsed < LINE_MS) {
        paintLine(line1Ref.current, elapsed / LINE_MS)
        paintLine(line2Ref.current, 0)
      } else if (elapsed < DRAW_MS) {
        paintLine(line1Ref.current, 1)
        paintLine(line2Ref.current, (elapsed - LINE_MS) / LINE_MS)
      } else {
        paintLine(line1Ref.current, 1)
        paintLine(line2Ref.current, 1)
        setPhase(readyRef.current ? 'fade' : 'pulse')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Pulse → fade when catalogue + fonts are ready
  useEffect(() => {
    if (phase !== 'pulse') return
    if (!ready) return
    setPhase('fade')
  }, [phase, ready])

  // Fade overlay out, then hand off to home header
  useEffect(() => {
    if (phase !== 'fade' || doneRef.current) return
    const a = audioRef.current
    if (a && !a.paused) {
      const startVol = a.volume
      const t0 = performance.now()
      const fade = (now: number) => {
        const t = Math.min(1, (now - t0) / FADE_MS)
        a.volume = Math.max(0, startVol * (1 - t))
        if (t < 1) requestAnimationFrame(fade)
        else a.pause()
      }
      requestAnimationFrame(fade)
    }
    const raf = requestAnimationFrame(() => setOverlayOpacity(0))
    const t = window.setTimeout(() => {
      doneRef.current = true
      onDone()
    }, FADE_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [phase, onDone])

  const onOverlayPointer = () => {
    const a = audioRef.current ?? getShankhAudio()
    a.volume = AUDIO_VOL
    a.play().then(() => setNeedsTap(false)).catch(() => {})
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white px-4"
      style={{
        opacity: overlayOpacity,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        pointerEvents: phase === 'fade' ? 'none' : 'auto',
      }}
      role="status"
      aria-label="Loading"
      onPointerDown={onOverlayPointer}
    >
      {/* Hidden element helps some mobile browsers unlock playback */}
      <audio src={AUDIO_SRC} preload="auto" playsInline style={{ display: 'none' }} />
      <style>{`
        @keyframes shloka-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div
        className="flex flex-col items-center w-full"
        style={{
          gap: 4,
          maxWidth: 360,
          animation: phase === 'pulse' ? `shloka-pulse ${PULSE_MS}ms ease-in-out infinite` : undefined,
        }}
      >
        <ShlokaLine raw={line1Svg} glyphsRef={line1Ref} width={353.268} height={37.055} />
        <ShlokaLine raw={line2Svg} glyphsRef={line2Ref} width={345.129} height={38.285} />
      </div>
      {needsTap && phase !== 'fade' && (
        <p
          className="absolute bottom-10 left-0 right-0 m-0 text-center text-[#FC9C02]"
          style={{ fontSize: 14, opacity: 0.85 }}
        >
          Tap to enable sound
        </p>
      )}
    </div>
  )
}
