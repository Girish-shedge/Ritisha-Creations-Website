import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import line1Svg from '@/assets/intro/line1.svg?raw'
import line2Svg from '@/assets/intro/line2.svg?raw'

const STROKE = '#B9B9B9'
const MIN_DRAW_MS = 2200
const FADE_MS = 480
const LINE1_END = 0.52

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function prepareSvg(raw: string) {
  return raw
    .replace(/fill="[^"]*"/g, 'fill="none"')
    .replace(/stroke="[^"]*"/g, '')
    .replace(/<path\b/g, `<path fill="none" stroke="${STROKE}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35"`)
}

/** visualProgress follows loadProgress but never finishes faster than MIN_DRAW_MS. */
function useDrawProgress(loadProgress: number) {
  const [visual, setVisual] = useState(0)
  const visualRef = useRef(0)
  const lastRef = useRef(performance.now())

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      const dt = Math.min(64, now - lastRef.current)
      lastRef.current = now
      const maxStep = dt / MIN_DRAW_MS
      let v = visualRef.current
      if (loadProgress < 1) {
        // Ceiling = real load; creep at most maxStep (so instant load still takes MIN_DRAW_MS)
        v = Math.min(loadProgress, v + maxStep)
      } else {
        v = Math.min(1, v + maxStep)
      }
      visualRef.current = v
      setVisual(v)
      if (v < 1 || loadProgress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [loadProgress])

  return visual
}

function ShlokaLine({
  raw, progress, width, height,
}: {
  raw: string
  progress: number // 0–1 for this line
  width: number
  height: number
}) {
  const host = useRef<HTMLDivElement>(null)
  const lengths = useRef<number[]>([])

  useLayoutEffect(() => {
    const root = host.current
    if (!root) return
    root.innerHTML = prepareSvg(raw)
    const svg = root.querySelector('svg')
    if (!svg) return
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.style.display = 'block'
    svg.style.overflow = 'visible'
    const paths = [...svg.querySelectorAll('path')]
    lengths.current = paths.map((p) => {
      try { return p.getTotalLength() }
      catch { return 100 }
    })
    paths.forEach((p, i) => {
      const len = lengths.current[i] || 100
      p.style.strokeDasharray = `${len}`
      p.style.strokeDashoffset = `${len}`
      p.style.fill = 'none'
      p.style.stroke = STROKE
    })
  }, [raw])

  useLayoutEffect(() => {
    const root = host.current
    if (!root) return
    const paths = [...root.querySelectorAll('path')]
    const n = paths.length || 1
    const p = easeInOut(Math.max(0, Math.min(1, progress)))
    paths.forEach((el, i) => {
      const len = lengths.current[i] || 100
      const start = i / n
      const end = (i + 1) / n
      const local = Math.max(0, Math.min(1, (p - start) / (end - start)))
      el.style.strokeDashoffset = `${len * (1 - local)}`
      el.style.fill = local >= 1 ? STROKE : 'none'
      el.style.transition = 'none'
    })
  }, [progress])

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
 * Full-screen shloka loader. `loadProgress` 0–1 from catalogue + cover images.
 * Calls onDone after draw completes and fade-out.
 */
export default function ShlokaIntro({
  loadProgress,
  onDone,
}: {
  loadProgress: number
  onDone: () => void
}) {
  const visual = useDrawProgress(loadProgress)
  const [fading, setFading] = useState(false)
  const doneRef = useRef(false)

  const line1 = Math.max(0, Math.min(1, visual / LINE1_END))
  const line2 = visual <= LINE1_END ? 0 : Math.max(0, Math.min(1, (visual - LINE1_END) / (1 - LINE1_END)))

  useEffect(() => {
    if (doneRef.current) return
    if (visual < 1 || loadProgress < 1) return
    doneRef.current = true
    setFading(true)
    const t = window.setTimeout(onDone, FADE_MS)
    return () => clearTimeout(t)
  }, [visual, loadProgress, onDone])

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white px-4"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center w-full" style={{ gap: 4, maxWidth: 360 }}>
        <ShlokaLine raw={line1Svg} progress={line1} width={353.268} height={37.055} />
        <ShlokaLine raw={line2Svg} progress={line2} width={345.129} height={38.285} />
      </div>
    </div>
  )
}
