/**
 * Boot shloka overlay (home only).
 *
 * Phase order: borders → plaque (slate) → Om → dividers → letter reveal → hold → exit.
 * - Borders pinned to the visual viewport (iOS-safe px slide, not % + scaleY).
 * - Plaque + text on a 393×800 stage scaled with min(vw, vh).
 * - Letters: CSS drop-shadow on each glyph + host (glow peaks mid-reveal).
 * - onDone fires when exit starts (kick home header); onGone when fully faded.
 * - ?loop=1 on the URL replays forever for design review.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import line1Svg from '@/assets/intro/line1.svg?raw'
import line2Svg from '@/assets/intro/line2.svg?raw'
import line3Svg from '@/assets/intro/line3.svg?raw'
import line4Svg from '@/assets/intro/line4.svg?raw'
import plaqueOuter from '@/assets/intro/plaque-outer.png'
import plaqueInner from '@/assets/intro/plaque-inner.png'
import omCircle from '@/assets/intro/om-circle.png'
import dividerSvg from '@/assets/intro/divider.svg'
import borderOrnament from '@/assets/intro/border-top.svg'

const FILL = '#DFCBC1'
const BORDER_MS = 480
const SLATE_FADE_MS = 480
const OM_FADE_MS = 520
const DIVIDER_MS = 480
const LINE_MS = 720
const DRAW_MS = LINE_MS * 4
const HOLD_MS = 550
const EXIT_MS = 420
const LOOP_GAP_MS = 400
const OM_SPIN_S = 40
const OM_OPACITY = 0.32

/** Steady letter drop-shadow (glow layered on top while appearing). */
const LETTER_SHADOW = 'drop-shadow(0px 2px 3px rgba(48, 30, 21, 0.65))'

const DESIGN_W = 393
const DESIGN_H = 800

const LINES = [
  { raw: line1Svg, width: 249.942, height: 37.915 },
  { raw: line2Svg, width: 237.065, height: 51.431, inset: [-5.83, -2.53, -17.5, -2.53] },
  { raw: line3Svg, width: 246.692, height: 53.624, inset: [-5.59, -2.43, -16.78, -2.43] },
  { raw: line4Svg, width: 228.916, height: 51.899, inset: [-5.78, -2.62, -17.34, -2.62] },
] as const

type Phase = 'borders' | 'slate' | 'om' | 'dividers' | 'text' | 'hold' | 'exit'

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** 0→1→0 ease for appear-glow (peaks mid-reveal, then fades out). */
function glowEnvelope(local: number) {
  return Math.sin(Math.max(0, Math.min(1, local)) * Math.PI)
}

function prepareSvg(raw: string) {
  return raw
    .replace(/<defs[\s\S]*?<\/defs>/gi, '')
    .replace(/\sfilter="[^"]*"/g, '')
    .replace(/stroke="[^"]*"/g, '')
    .replace(/fill="[^"]*"/g, `fill="${FILL}"`)
    .replace(/fill-opacity="[^"]*"/g, 'fill-opacity="0.9"')
}

type Glyph = { el: SVGPathElement; weight: number }

function prepLine(host: HTMLDivElement, raw: string): Glyph[] {
  host.innerHTML = prepareSvg(raw)
  const svg = host.querySelector('svg')
  if (!svg) return []
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.display = 'block'
  svg.style.overflow = 'visible'
  // Host-level shadow so iOS still sees drop-shadow when path filters are ignored
  host.style.filter = LETTER_SHADOW

  const paths = [...svg.querySelectorAll('path')]
  paths.sort((a, b) => {
    try { return a.getBBox().x - b.getBBox().x }
    catch { return 0 }
  })

  return paths.map((el) => {
    let weight = 40
    try { weight = Math.max(24, el.getTotalLength()) }
    catch { /* keep floor */ }
    el.style.fill = FILL
    el.style.stroke = 'none'
    el.style.opacity = '0'
    el.style.filter = LETTER_SHADOW
    el.removeAttribute('filter')
    return { el, weight }
  })
}

function paintLine(glyphs: Glyph[], localT: number) {
  const t = easeInOut(Math.max(0, Math.min(1, localT)))
  const total = glyphs.reduce((s, g) => s + g.weight, 0) || 1
  let cursor = 0
  let maxGlow = 0
  for (const g of glyphs) {
    const start = cursor / total
    const end = (cursor + g.weight) / total
    cursor += g.weight
    const local = Math.max(0, Math.min(1, (t - start) / (end - start || 1)))
    const appear = easeInOut(local)
    g.el.style.opacity = String(appear)

    const glow = glowEnvelope(local) * appear
    maxGlow = Math.max(maxGlow, glow)
    if (glow > 0.02) {
      const blur = 3 + glow * 8
      const soft = 8 + glow * 14
      g.el.style.filter = [
        `drop-shadow(0 0 ${blur}px rgba(255, 236, 210, ${0.98 * glow}))`,
        `drop-shadow(0 0 ${soft}px rgba(223, 203, 193, ${0.7 * glow}))`,
        LETTER_SHADOW,
      ].join(' ')
    } else {
      g.el.style.filter = LETTER_SHADOW
    }
  }

  const host = glyphs[0]?.el.closest('div')
  if (host instanceof HTMLElement) {
    if (maxGlow > 0.02) {
      const blur = 3 + maxGlow * 8
      const soft = 8 + maxGlow * 14
      host.style.filter = [
        `drop-shadow(0 0 ${blur}px rgba(255, 236, 210, ${0.98 * maxGlow}))`,
        `drop-shadow(0 0 ${soft}px rgba(223, 203, 193, ${0.7 * maxGlow}))`,
        LETTER_SHADOW,
      ].join(' ')
    } else {
      host.style.filter = LETTER_SHADOW
    }
  }
}

function clearLines(refs: React.MutableRefObject<Glyph[]>[]) {
  for (const r of refs) {
    for (const g of r.current) {
      g.el.style.opacity = '0'
      g.el.style.filter = LETTER_SHADOW
    }
    const host = r.current[0]?.el.closest('div')
    if (host instanceof HTMLElement) host.style.filter = LETTER_SHADOW
  }
}

function ShlokaLine({
  raw, glyphsRef, width, height, name, inset,
}: {
  raw: string
  glyphsRef: React.MutableRefObject<Glyph[]>
  width: number
  height: number
  name: string
  inset?: readonly [number, number, number, number]
}) {
  const host = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = host.current
    if (!root) return
    glyphsRef.current = prepLine(root, raw)
    return () => { glyphsRef.current = [] }
  }, [raw, glyphsRef])

  const [t, r, b, l] = inset ?? [0, 0, 0, 0]

  return (
    <div
      className="relative w-full"
      data-name={name}
      style={{
        maxWidth: width,
        aspectRatio: `${width} / ${height}`,
        overflow: 'visible',
      }}
      aria-hidden
    >
      <div
        ref={host}
        className="absolute"
        style={{ top: `${t}%`, right: `${r}%`, bottom: `${b}%`, left: `${l}%` }}
      />
    </div>
  )
}

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

function viewportSize() {
  const vv = window.visualViewport
  return {
    w: Math.min(vv?.width ?? window.innerWidth, 480),
    h: vv?.height ?? window.innerHeight,
  }
}

/**
 * Figma 334:29498 — scaled to fit any viewport.
 */
export default function ShlokaIntro({
  ready,
  onDone,
  onGone,
  loop = false,
}: {
  ready: boolean
  onDone: () => void
  onGone?: () => void
  loop?: boolean
}) {
  const line1Ref = useRef<Glyph[]>([])
  const line2Ref = useRef<Glyph[]>([])
  const line3Ref = useRef<Glyph[]>([])
  const line4Ref = useRef<Glyph[]>([])
  const lineRefs = [line1Ref, line2Ref, line3Ref, line4Ref]

  const [cycle, setCycle] = useState(0)
  const [phase, setPhase] = useState<Phase>('borders')
  const [assetsReady, setAssetsReady] = useState(false)
  const [borderT, setBorderT] = useState(0)
  const [omOpacity, setOmOpacity] = useState(0)
  const [omSpin, setOmSpin] = useState(false)
  const [slateOpacity, setSlateOpacity] = useState(0)
  const [dividerScale, setDividerScale] = useState(0)
  const [textOpacity, setTextOpacity] = useState(0)
  const [exitT, setExitT] = useState(0)
  const [scale, setScale] = useState(1)
  const [borderPx, setBorderPx] = useState(56)
  const [shellH, setShellH] = useState(
    () => (typeof window !== 'undefined' ? viewportSize().h : 800),
  )

  const doneRef = useRef(false)
  const goneRef = useRef(false)
  const readyRef = useRef(ready)
  readyRef.current = ready
  const loopRef = useRef(loop)
  loopRef.current = loop
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const onGoneRef = useRef(onGone)
  onGoneRef.current = onGone

  useEffect(() => {
    const fit = () => {
      const { w, h } = viewportSize()
      setShellH(h)
      setScale(Math.min(w / DESIGN_W, h / DESIGN_H))
      setBorderPx(Math.max(48, Math.min(72, h * 0.09)))
    }
    fit()
    window.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('scroll', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('scroll', fit)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      preload(plaqueOuter),
      preload(plaqueInner),
      preload(omCircle),
      preload(borderOrnament),
      preload(dividerSvg),
    ]).then(() => {
      if (!cancelled) setAssetsReady(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setPhase('borders')
    setBorderT(0)
    setOmOpacity(0)
    setOmSpin(false)
    setSlateOpacity(0)
    setDividerScale(0)
    setTextOpacity(0)
    setExitT(0)
    clearLines(lineRefs)
    doneRef.current = false
    goneRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle])

  useEffect(() => {
    if (!assetsReady || phase !== 'borders') return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / BORDER_MS)
      setBorderT(easeInOut(u))
      if (u >= 1) { setBorderT(1); setPhase('slate'); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [assetsReady, phase, cycle])

  useEffect(() => {
    if (phase !== 'slate') return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / SLATE_FADE_MS)
      setSlateOpacity(easeInOut(u))
      if (u >= 1) { setSlateOpacity(1); setPhase('om'); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle])

  useEffect(() => {
    if (phase !== 'om') return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / OM_FADE_MS)
      setOmOpacity(easeInOut(u))
      if (u >= 1) { setOmOpacity(1); setOmSpin(true); setPhase('dividers'); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle])

  useEffect(() => {
    if (phase !== 'dividers') return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / DIVIDER_MS)
      setDividerScale(easeInOut(u))
      if (u >= 1) { setDividerScale(1); setPhase('text'); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle])

  useEffect(() => {
    if (phase !== 'text') return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - t0
      setTextOpacity(easeInOut(Math.min(1, elapsed / 200)))
      for (let i = 0; i < 4; i++) {
        const start = i * LINE_MS
        if (elapsed < start) paintLine(lineRefs[i].current, 0)
        else if (elapsed < start + LINE_MS) paintLine(lineRefs[i].current, (elapsed - start) / LINE_MS)
        else paintLine(lineRefs[i].current, 1)
      }
      if (elapsed >= DRAW_MS) { setTextOpacity(1); setPhase('hold'); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cycle])

  useEffect(() => {
    if (phase !== 'hold') return
    if (loopRef.current) {
      const t = window.setTimeout(() => setCycle((c) => c + 1), HOLD_MS + LOOP_GAP_MS)
      return () => clearTimeout(t)
    }
    if (!ready) return
    const t = window.setTimeout(() => setPhase('exit'), HOLD_MS)
    return () => clearTimeout(t)
  }, [phase, ready, cycle])

  useEffect(() => {
    if (phase !== 'exit') return
    if (!doneRef.current) {
      doneRef.current = true
      onDoneRef.current()
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / EXIT_MS)
      setExitT(easeInOut(u))
      if (u >= 1) {
        setExitT(1)
        if (!goneRef.current) {
          goneRef.current = true
          onGoneRef.current?.()
        }
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle])

  const rootOpacity = 1 - exitT
  // Pixel slides — % translateY on bottom:0 is flaky on iOS Chrome
  const topShift = (1 - borderT) * -borderPx
  const botShift = (1 - borderT) * borderPx

  return (
    <div
      className="absolute left-0 right-0 top-0 z-50 overflow-hidden"
      style={{
        height: shellH,
        maxHeight: '100%',
        background: 'linear-gradient(to bottom, #f5eae6 0%, #ffffff 51.671%, #f8f0ed 100%)',
        opacity: rootOpacity,
        pointerEvents: phase === 'exit' ? 'none' : undefined,
        boxSizing: 'border-box',
      }}
      role="status"
      aria-label="Loading"
      data-name="ShlokaIntro"
    >
      <style>{`
        @keyframes om-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-20"
        data-name="borderTop"
        style={{
          height: borderPx,
          transform: `translate3d(0, ${topShift}px, 0)`,
          opacity: assetsReady ? 1 : 0,
          willChange: 'transform',
        }}
        aria-hidden
      >
        <img
          src={borderOrnament}
          alt=""
          className="block size-full"
          style={{ objectFit: 'fill', transform: 'rotate(180deg)' }}
          draggable={false}
        />
      </div>

      <div
        className="pointer-events-none absolute left-0 right-0 z-20"
        data-name="borderBottom"
        style={{
          height: borderPx,
          // Above home indicator / browser chrome — bottom:0 sits under the notch bar on iPhone
          bottom: 'env(safe-area-inset-bottom, 0px)',
          transform: `translate3d(0, ${botShift}px, 0)`,
          opacity: assetsReady ? 1 : 0,
          willChange: 'transform',
        }}
        aria-hidden
      >
        {/* Vertical mirror of top: same rotate(180) then scaleY on wrapper (not <img> — iOS blank paint) */}
        <div className="size-full" style={{ transform: 'scaleY(-1)', transformOrigin: 'center center' }}>
          <img
            src={borderOrnament}
            alt=""
            className="block size-full"
            style={{ objectFit: 'fill', transform: 'rotate(180deg)' }}
            draggable={false}
          />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="relative shrink-0"
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2"
            data-name="omCircle"
            style={{
              width: 668,
              height: 668,
              opacity: omOpacity * OM_OPACITY,
              animation: omSpin ? `om-spin ${OM_SPIN_S}s linear infinite` : undefined,
              transform: omSpin ? undefined : 'translate(-50%, -50%)',
              willChange: omSpin ? 'transform' : undefined,
            }}
            aria-hidden
          >
            <img
              src={omCircle}
              alt=""
              className="block size-full object-cover"
              style={{ filter: 'invert(1)' }}
              draggable={false}
            />
          </div>

          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div
              className="relative w-full"
              data-name="plaque"
              style={{
                maxWidth: 366,
                aspectRatio: '365.637 / 437.884',
                opacity: slateOpacity,
              }}
            >
              <img
                src={plaqueOuter}
                alt=""
                aria-hidden
                data-name="plaqueOuter"
                className="absolute inset-0 size-full object-contain pointer-events-none"
                draggable={false}
              />
              <img
                src={plaqueInner}
                alt=""
                aria-hidden
                data-name="plaqueInner"
                className="absolute pointer-events-none"
                style={{
                  left: '2.9%',
                  top: '2.9%',
                  width: '94.2%',
                  height: '94.2%',
                  objectFit: 'contain',
                }}
                draggable={false}
              />

              <div
                className="absolute left-1/2 pointer-events-none"
                data-name="dividerTop"
                style={{
                  top: '16.4%',
                  width: '41.2%',
                  transform: `translateX(-50%) scaleX(${dividerScale})`,
                  transformOrigin: 'center center',
                }}
                aria-hidden
              >
                <img src={dividerSvg} alt="" className="block w-full h-auto" draggable={false} />
              </div>

              <div
                className="absolute left-1/2 pointer-events-none"
                data-name="dividerBottom"
                style={{
                  bottom: '16.4%',
                  width: '41.2%',
                  transform: `translateX(-50%) scaleX(${dividerScale})`,
                  transformOrigin: 'center center',
                }}
                aria-hidden
              >
                <img src={dividerSvg} alt="" className="block w-full h-auto" draggable={false} />
              </div>

              <div
                className="absolute inset-0 flex flex-col items-center justify-center overflow-visible"
                data-name="shlokaText"
                style={{
                  padding: '22% 12%',
                  gap: 6,
                  opacity: textOpacity,
                }}
              >
                {LINES.map((line, i) => (
                  <ShlokaLine
                    key={i}
                    raw={line.raw}
                    glyphsRef={lineRefs[i]}
                    width={line.width}
                    height={line.height}
                    name={`line${i + 1}`}
                    inset={'inset' in line ? line.inset : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
