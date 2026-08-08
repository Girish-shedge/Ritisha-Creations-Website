import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import {
  categoryPath,
  readCatalogueCache,
  type CategoryData,
  type CategoryPhoto,
} from '@/data/categories'
import { loadCatalogue } from '@/data/driveCatalogue'
import { prefetchCategoryShare, shareCategory } from '@/lib/share'
import ShlokaIntro from '@/ShlokaIntro'
import bgImg from '@/assets/bg.png'
import placeholderImg from '@/assets/placeholder.png'
import iconBack from '@/assets/icons/chevron-left.svg'
import iconShare from '@/assets/icons/share.svg'

const SLIDE_MS = 3500
const SLIDE_EASE_MS = 700
const CARD_ARM_MS = 1000
const GALLERY_NAV_MS = 520

// ── Design tokens ─────────────────────────────────────────────
const FONT_BOLD = "'Season Mix-TRIAL:Bold', 'Poppins', sans-serif"
const FONT_SEMI = "'Season Mix-TRIAL:SemiBold', 'Poppins', sans-serif"
const FS_HEAD   = 36
const FS_CHROME = 16
const NAV_BTN = 40

// ── SVG paths (from Figma Extension V2: 298:141676 / 298:141678) ──
// Header: flat top, bump hangs down. Footer: flat bottom, bump points up.
const HEADER =
  'M0 8.35612L0 0L393 0L393 8.35616C393 31.0462 372.336 48.1238 350.052 43.8501L350.052 56.846C350.052 107.23 226.655 31.3836 196.5 87.3859C166.207 31.1282 42.9478 107.317 42.9478 56.846L42.9478 43.8501C20.6641 48.1233 0 31.0461 0 8.35612Z'
const FOOTER =
  'M393 79.0298V87.3859H0V79.0944V79.0298C0 56.3397 20.6641 39.2621 42.9478 43.5358V30.5399C42.9478 -19.844 166.345 56.0023 196.5 0C226.793 56.2577 350.052 -19.9307 350.052 30.5399V43.5358C372.336 39.2626 393 56.3397 393 79.0298Z'
const CARD_OVERLAY =
  'M361 97.5C348.574 97.5 338.5 107.574 338.5 120H22.5C22.5 107.574 12.4264 97.5 0 97.5V0H361V97.5Z'
// Figma Subtract 281:132809 — 361² rect minus ~45px corner ellipses
const CARD_FRAME =
  'M338.508 0C338.508 12.228 348.265 22.177 360.419 22.485L361 22.492V338.508C348.578 338.508 338.508 348.578 338.508 361H22.492C22.492 348.578 12.422 338.508 0 338.508V22.492C12.228 22.492 22.176 12.735 22.484 0.581L22.492 0H338.508Z'
const CARD_FRAME_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 361 361"><path fill="white" d="${CARD_FRAME}"/></svg>`,
)}")`

// Half-path strokes: centre peak → outer corner (draw outward L+R simultaneously).
const HEADER_LEFT =
  'M196.5 87.3859 C166.207 31.1282 42.9478 107.317 42.9478 56.846 V43.8501 C20.6641 48.1238 0 31.0462 0 8.35612 V0'
const HEADER_RIGHT =
  'M196.5 87.3859 C226.655 31.3836 350.052 107.23 350.052 56.846 V43.8501 C372.336 48.1238 393 31.0462 393 8.35616 V0'
const FOOTER_LEFT =
  'M196.5 0 C166.345 56.0023 42.9478 -19.844 42.9478 30.5399 V43.5358 C20.6641 39.2621 0 56.3397 0 79.0298 V87.3859'
const FOOTER_RIGHT =
  'M196.5 0 C226.793 56.2577 350.052 -19.9307 350.052 30.5399 V43.5358 C372.336 39.2626 393 56.3397 393 79.0298 V87.3859'

const WAVE_AR = 393 / 87.3859

const WA_NUMBER = '918766630191'
function waUrl(message: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}
function waCategoryMsg(name: string) {
  return `Hey, I am interested in ${name}`
}

// ── Intro animation ───────────────────────────────────────────
// Header intro once per app load (lives in App). Gallery footer intro plays
// each time a category screen mounts.

type IntroPhase = 'wait' | 'trace' | 'cards' | 'done'

const T_TRACE_DUR = 1100
const T_FILL_DUR  = 500
const T_TEXT_DUR  = 400
const T_CARDS_GAP = 700  // after header text, then enable scroll

// ── Font-ready hook ───────────────────────────────────────────
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { document.fonts.ready.then(() => setReady(true)) }, [])
  return ready
}

// ── Background ────────────────────────────────────────────────
function BgImage() {
  return (
    <img src={bgImg} alt="" aria-hidden
      loading="eager" fetchPriority="high" decoding="async"
      className="pointer-events-none absolute inset-0 size-full object-cover opacity-85"
    />
  )
}

// ── Wave blur (exact Figma pattern) ───────────────────────────
interface WaveBlurProps {
  clipId: string; path: string
  w?: number; h?: number
  active: boolean; pathTransform?: string
}
function WaveBlur({ clipId, path, w = 393, h = 87.3859, active, pathTransform }: WaveBlurProps) {
  const pad = 12
  return (
    <>
      <foreignObject x={-pad} y={-pad} width={w + pad * 2} height={h + pad * 2}
        style={{ opacity: active ? 1 : 0, transition: 'opacity 350ms ease-in-out' }}>
        <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                   clipPath: `url(#${clipId})`, height: '100%', width: '100%' }} />
      </foreignObject>
      <defs>
        <clipPath id={clipId} transform={`translate(${pad} ${pad})`}>
          <path d={path} transform={pathTransform} />
        </clipPath>
      </defs>
    </>
  )
}

// Shared stroke-draw props. vector-effect keeps the line visible under preserveAspectRatio="none".
function strokeDrawProps(opts: {
  color: string
  go: boolean
  visible: boolean
  duration: number
}) {
  return {
    fill: 'none' as const,
    stroke: opts.color,
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    pathLength: 1,
    strokeDasharray: 1,
    vectorEffect: 'non-scaling-stroke' as const,
    style: {
      strokeDashoffset: opts.go ? 0 : 1,
      opacity: opts.visible ? 1 : 0,
      transition: `stroke-dashoffset ${opts.duration}ms ease-in-out, opacity 280ms ease-in-out`,
    } as React.CSSProperties,
  }
}

/** Runs stroke → fill → text, advancing only after stroke CSS transition actually ends. */
type ChromeStep = 'stroke' | 'fill' | 'text' | 'done'
function useChromeIntro(play: boolean, onComplete?: () => void) {
  const [step, setStep] = useState<ChromeStep>(() => (play ? 'stroke' : 'done'))
  const [traceGo, setTraceGo] = useState(() => !play)
  const strokeDone = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Footer starts with play=false, then flips true — reset and run the sequence.
  useEffect(() => {
    if (!play) return
    strokeDone.current = false
    setTraceGo(false)
    setStep('stroke')
  }, [play])

  useEffect(() => {
    if (step !== 'stroke') return
    strokeDone.current = false
    const id = requestAnimationFrame(() => setTraceGo(true))
    return () => cancelAnimationFrame(id)
  }, [step])

  // Fallback if transitionend doesn't fire (hidden/offscreen edge cases).
  useEffect(() => {
    if (step !== 'stroke' || !traceGo) return
    const t = window.setTimeout(() => {
      if (strokeDone.current) return
      strokeDone.current = true
      setStep('fill')
    }, T_TRACE_DUR + 80)
    return () => clearTimeout(t)
  }, [step, traceGo])

  useEffect(() => {
    if (step !== 'fill') return
    const t = window.setTimeout(() => setStep('text'), T_FILL_DUR)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    if (step !== 'text') return
    const t = window.setTimeout(() => {
      setStep('done')
      onCompleteRef.current?.()
    }, T_TEXT_DUR)
    return () => clearTimeout(t)
  }, [step])

  const onStrokeTransitionEnd = (e: React.TransitionEvent<SVGPathElement>) => {
    if (e.propertyName !== 'stroke-dashoffset') return
    if (strokeDone.current || step !== 'stroke') return
    strokeDone.current = true
    setStep('fill')
  }

  return {
    step,
    traceGo,
    onStrokeTransitionEnd,
    showFill: step === 'fill' || step === 'text' || step === 'done',
    showText: step === 'text' || step === 'done',
    settled: step === 'done',
    tracing: step === 'stroke',
  }
}

// ── Blue sticky header ────────────────────────────────────────
function BlueHeader({
  label, scrolled, playIntro, onIntroComplete,
}: {
  label: string
  scrolled: boolean
  playIntro: boolean
  onIntroComplete?: () => void
}) {
  const { traceGo, onStrokeTransitionEnd, showFill, showText, settled, tracing } =
    useChromeIntro(playIntro, onIntroComplete)

  const stroke = strokeDrawProps({
    color: '#007AB1',
    go: traceGo,
    visible: tracing,
    duration: T_TRACE_DUR,
  })

  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 size-full"
        viewBox="0 0 393 87.3859" preserveAspectRatio="none" fill="none">
        {settled && <WaveBlur clipId="blueH_wblur" path={HEADER} active={scrolled} />}
        <path
          d={HEADER}
          fill="url(#blueHGrad)"
          style={{
            fillOpacity: showFill ? (settled && scrolled ? 0.75 : 1) : 0,
            transition: `fill-opacity ${T_FILL_DUR}ms ease-in-out`,
          }}
        />
        <path d={HEADER_LEFT} {...stroke} onTransitionEnd={onStrokeTransitionEnd} />
        <path d={HEADER_RIGHT} {...stroke} />
        <defs>
          <linearGradient id="blueHGrad" x1="196.5" y1="80.823" x2="196.5" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#007AB1" /><stop offset="1" stopColor="#00579A" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className="absolute text-center text-white z-10 pointer-events-none"
        style={{
          top: '43.4%', left: 24, right: 24,
          transform: `translateY(-50%) translateY(${showText ? 0 : 8}px)`,
          fontFamily: FONT_BOLD, fontWeight: 780,
          fontSize: FS_CHROME, lineHeight: 1.2,
          opacity: showText ? 1 : 0,
          transition: `opacity ${T_TEXT_DUR}ms ease-in-out, transform ${T_TEXT_DUR}ms ease-in-out`,
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Green sticky footer ───────────────────────────────────────
function GreenFooter({
  label, scrolled, href, playIntro = false, onIntroComplete, visible = true,
}: {
  label: string
  scrolled: boolean
  href: string
  playIntro?: boolean
  onIntroComplete?: () => void
  visible?: boolean
}) {
  const { traceGo, onStrokeTransitionEnd, showFill, showText, settled, tracing } =
    useChromeIntro(playIntro, onIntroComplete)

  const stroke = strokeDrawProps({
    color: '#4CED77',
    go: traceGo,
    visible: tracing,
    duration: T_TRACE_DUR,
  })

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="pointer-events-auto block active:opacity-75" aria-label={label}
      style={{ visibility: visible ? 'visible' : 'hidden' }}>
      <div className="relative w-full" style={{ aspectRatio: `${WAVE_AR}` }}>
        <svg className="absolute inset-0 size-full"
          viewBox="0 0 393 87.3859" preserveAspectRatio="none" fill="none">
          {settled && <WaveBlur clipId="greenF_wblur" path={FOOTER} active={scrolled} />}
          <path d={FOOTER} fill="url(#greenFGrad)"
            style={{
              fillOpacity: showFill ? (settled && scrolled ? 0.75 : 1) : 0,
              transition: `fill-opacity ${T_FILL_DUR}ms ease-in-out`,
            }} />
          <path d={FOOTER_LEFT} {...stroke} onTransitionEnd={onStrokeTransitionEnd} />
          <path d={FOOTER_RIGHT} {...stroke} />
          <defs>
            <linearGradient id="greenFGrad" x1="196.5" y1="6.563" x2="196.5" y2="87.386" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6CEB3E" /><stop offset="1" stopColor="#4CED77" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute left-0 right-0 text-center z-10 pointer-events-none"
          style={{
            bottom: '40%',
            transform: `translateY(50%) translateY(${showText ? 0 : 8}px)`,
            fontFamily: FONT_BOLD, fontWeight: 780,
            fontSize: FS_CHROME, lineHeight: 1.2, color: '#0d2b08',
            opacity: showText ? 1 : 0,
            transition: `opacity ${T_TEXT_DUR}ms ease-in-out, transform ${T_TEXT_DUR}ms ease-in-out`,
          }}>
          {label}
        </span>
      </div>
    </a>
  )
}

function NavIconBtn({
  label, onClick, src,
}: {
  label: string
  onClick: () => void
  src: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center shrink-0 active:opacity-75"
      style={{
        width: NAV_BTN,
        height: NAV_BTN,
        borderRadius: 62,
        background: 'linear-gradient(to top, #000 12.393%, #333)',
      }}
    >
      <img src={src} alt="" width={24} height={24} className="block size-6" draggable={false} />
    </button>
  )
}

function DriveImg({
  src, alt, priority, className, style,
}: {
  src: string
  alt: string
  priority?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setLoaded(false) }, [src])
  return (
    <>
      <img
        src={placeholderImg}
        alt=""
        aria-hidden
        className={className}
        style={{
          ...style,
          opacity: loaded ? 0 : 1,
          transition: 'opacity 280ms ease-in-out',
        }}
        draggable={false}
      />
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 280ms ease-in-out',
        }}
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
    </>
  )
}

// ── Card blur overlay ─────────────────────────────────────────
function CardBlurOverlay({ uid }: { uid: string }) {
  const clipId = `cClip_${uid}`, gradId = `cGrad_${uid}`
  return (
    <div className="absolute bottom-0 left-0 right-0" style={{ height: '33.2%' }}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 361 120" preserveAspectRatio="none" fill="none">
        <foreignObject height="128" width="369" x="-4" y="-4">
          <div style={{ backdropFilter: 'blur(1px)', clipPath: `url(#${clipId})`, height: '100%', width: '100%' }}
            {...{ xmlns: 'http://www.w3.org/1999/xhtml' }} />
        </foreignObject>
        <path d={CARD_OVERLAY} fill={`url(#${gradId})`} fillOpacity="0.3" />
        <defs>
          <clipPath id={clipId} transform="translate(4 4)"><path d={CARD_OVERLAY} /></clipPath>
          <linearGradient id={gradId} x1="180.5" y1="120" x2="180.5" y2="0" gradientUnits="userSpaceOnUse">
            <stop /><stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ── Home list scroll focus (centre = 100%, edges → 90% / 75%) ─
function useScrollFocus(cardRef: React.RefObject<HTMLElement | null>, scrollerRef: React.RefObject<HTMLElement | null>) {
  const [focus, setFocus] = useState(1)
  useEffect(() => {
    const card = cardRef.current
    const root = scrollerRef.current
    if (!card || !root) return
    let raf = 0
    const update = () => {
      raf = 0
      const cr = card.getBoundingClientRect()
      const rr = root.getBoundingClientRect()
      const mid = rr.top + rr.height / 2
      const cardMid = cr.top + cr.height / 2
      const dist = Math.abs(cardMid - mid)
      const range = Math.max(rr.height * 0.55, 1)
      setFocus(Math.max(0, Math.min(1, 1 - dist / range)))
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      root.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [cardRef, scrollerRef])
  return {
    focus,
    scale: 0.9 + 0.1 * focus,
    opacity: 0.75 + 0.25 * focus,
  }
}

// ── Viewport-grow button ──────────────────────────────────────
function ViewportButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setWide(true) }, { threshold: 0.6 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return (
    <button ref={ref} onClick={onClick}
      className="flex items-center justify-center overflow-hidden active:opacity-75"
      style={{
        paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
        borderRadius: 62,
        background: 'linear-gradient(to top, #000 12.393%, #333)',
        width: wide ? '100%' : '90%',
        transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
      {children}
    </button>
  )
}

// ── Card image scroller (infinite horizontal, ease-in-out) ────
const DOT_H = 4
const DOT_W = 4
const DOT_ACTIVE_W = 12

function CardDots({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null
  return (
    <div
      className="flex items-center justify-center"
      style={{ gap: 6, height: DOT_H, minHeight: DOT_H }}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => {
        const on = i === active
        return (
          <span
            key={i}
            className="bg-white block shrink-0"
            style={{
              width: on ? DOT_ACTIVE_W : DOT_W,
              height: DOT_H,
              borderRadius: 9999,
              opacity: on ? 1 : 0.55,
              transition: 'width 500ms ease-in-out, opacity 500ms ease-in-out',
              willChange: 'width, opacity',
            }}
          />
        )
      })}
    </div>
  )
}

function CardImageScroller({
  photos, alt, onIndexChange, autoplay,
}: {
  photos: CategoryPhoto[]
  alt: string
  onIndexChange?: (i: number) => void
  /** true after the card has stayed centred ≥1s */
  autoplay: boolean
}) {
  const n = photos.length
  const track = n > 1 ? [...photos, photos[0]] : photos
  const [i, setI] = useState(0)
  const [anim, setAnim] = useState(true)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [manual, setManual] = useState(false)
  const startX = useRef<number | null>(null)
  const active = i >= n ? 0 : i
  const canAuto = autoplay && !manual && n > 1

  useEffect(() => {
    onIndexChange?.(active)
  }, [active, onIndexChange])

  // Reset manual lock when card loses autoplay (scrolled away)
  useEffect(() => {
    if (!autoplay) setManual(false)
  }, [autoplay])

  useEffect(() => {
    if (!canAuto) return
    if (i < n) {
      const t = window.setTimeout(() => setI((x) => x + 1), SLIDE_MS)
      return () => clearTimeout(t)
    }
    const t = window.setTimeout(() => {
      setAnim(false)
      setI(0)
    }, SLIDE_EASE_MS)
    return () => clearTimeout(t)
  }, [i, n, canAuto])

  useEffect(() => {
    if (anim || i !== 0) return
    const id = requestAnimationFrame(() => setAnim(true))
    return () => cancelAnimationFrame(id)
  }, [anim, i])

  useEffect(() => {
    if (n <= 1) return
    const next = photos[(active + 1) % n]
    const img = new Image()
    img.src = next.thumb
  }, [active, n, photos])

  const goBy = (dir: number) => {
    if (n <= 1) return
    setManual(true)
    setAnim(true)
    setI((cur) => {
      const base = cur >= n ? 0 : cur
      return (base + dir + n) % n
    })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (n <= 1) return
    startX.current = e.clientX
    setDragging(true)
    setDrag(0)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return
    setDrag(e.clientX - startX.current)
  }
  const onPointerUp = () => {
    if (startX.current == null) return
    const dx = drag
    startX.current = null
    setDragging(false)
    setDrag(0)
    if (Math.abs(dx) > 40) goBy(dx < 0 ? 1 : -1)
  }

  const width = typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) : 360
  const pct = i * 100 - (drag / Math.max(width, 1)) * 100

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'pan-y' }}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${pct}%)`,
          transition: dragging || !anim
            ? 'none'
            : `transform ${SLIDE_EASE_MS}ms ease-in-out`,
          willChange: 'transform',
        }}
      >
        {track.map((photo, idx) => (
          <div key={idx} className="relative h-full shrink-0 grow-0" style={{ flexBasis: '100%' }}>
            <DriveImg
              src={photo.thumb}
              alt={idx === 0 ? alt : ''}
              priority={idx === 0}
              className="absolute inset-0 size-full object-cover object-center block pointer-events-none"
              style={{ maxWidth: 'none' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Category card ─────────────────────────────────────────────
interface CategoryCardProps {
  category: CategoryData; onViewAll: () => void
  introVisible: boolean; introDelay: number
  scrollerRef: React.RefObject<HTMLElement | null>
  scrollActive: boolean
}
function CategoryCard({
  category, onViewAll, introVisible, introDelay, scrollerRef, scrollActive,
}: CategoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { focus, scale, opacity } = useScrollFocus(cardRef, scrollerRef)
  const [slide, setSlide] = useState(0)
  const [armed, setArmed] = useState(false)
  const onSlide = useCallback((i: number) => setSlide(i), [])
  const s = scrollActive ? scale : 1
  const o = !introVisible ? 0 : scrollActive ? opacity : 1

  useEffect(() => {
    const centred = scrollActive && focus >= 0.85
    if (!centred) {
      setArmed(false)
      return
    }
    const t = window.setTimeout(() => setArmed(true), CARD_ARM_MS)
    return () => clearTimeout(t)
  }, [focus, scrollActive])

  return (
    <div
      ref={cardRef}
      className="flex flex-col gap-4 items-center w-full"
      style={{
        opacity: o,
        transform: introVisible
          ? `translateY(0) scale(${s})`
          : `translateY(52px) scale(${s})`,
        transformOrigin: 'center center',
        transition: scrollActive
          ? 'transform 120ms linear, opacity 120ms linear'
          : `opacity 550ms ease-out ${introDelay}ms, transform 550ms cubic-bezier(0.22,1,0.36,1) ${introDelay}ms`,
        willChange: 'transform, opacity',
      }}>
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '1 / 1',
          WebkitMaskImage: CARD_FRAME_MASK,
          maskImage: CARD_FRAME_MASK,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      >
        <CardImageScroller
          photos={category.photos}
          alt={category.galleryTitle}
          onIndexChange={onSlide}
          autoplay={armed}
        />
        <CardBlurOverlay uid={category.id} />
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end z-10 pb-4 pointer-events-none"
          style={{ paddingLeft: 24, paddingRight: 24, gap: 12 }}>
          <CardDots count={category.photos.length} active={slide} />
          <div className="flex flex-col items-center w-full">
            {category.lines.map((line, i) => (
              <p key={i} className="text-white text-center leading-tight m-0 w-full"
                style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: FS_HEAD }}>{line}</p>
            ))}
          </div>
        </div>
      </div>
      <ViewportButton onClick={onViewAll}>
        <span style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: FS_CHROME, color: '#fff', lineHeight: 1.4 }}>
          View all photos
        </span>
      </ViewportButton>
    </div>
  )
}

// ── Screen 1 ─────────────────────────────────────────────────
interface HomeScreenProps {
  categories: CategoryData[]
  onViewAll: (cat: CategoryData) => void
  introPhase: IntroPhase
  setIntroPhase: (p: IntroPhase) => void
}
function HomeScreen({ categories, onViewAll, introPhase, setIntroPhase }: HomeScreenProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [headerH, setHeaderH] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) / WAVE_AR : 0)

  const onHeaderIntroComplete = useCallback(() => {
    setIntroPhase('cards')
  }, [setIntroPhase])

  useEffect(() => {
    if (introPhase !== 'cards') return
    const t = window.setTimeout(() => setIntroPhase('done'), T_CARDS_GAP)
    return () => clearTimeout(t)
  }, [introPhase, setIntroPhase])

  useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const cardsVisible = introPhase === 'cards' || introPhase === 'done'
  const scrollable = introPhase === 'done'

  return (
    <div className="relative size-full overflow-hidden">
      <BgImage />

      <div ref={headerRef} className="absolute top-0 left-0 right-0 z-30" style={{ aspectRatio: `${WAVE_AR}` }}>
        <BlueHeader
          label="Ritisha Creations"
          scrolled={scrolled}
          playIntro={introPhase === 'trace'}
          onIntroComplete={onHeaderIntroComplete}
        />
      </div>

      <div
        ref={scrollerRef}
        className="absolute inset-0 overflow-y-auto scroll-smooth"
        style={{
          paddingTop: headerH + 16,
          paddingBottom: 40,
          overflowY: scrollable ? 'auto' : 'hidden',
        }}
        onScroll={(e) => scrollable && setScrolled(e.currentTarget.scrollTop > 8)}
      >
        <div className="flex flex-col gap-10 items-center px-4 pt-4">
          {categories.map((cat, i) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onViewAll={() => onViewAll(cat)}
              introVisible={cardsVisible}
              introDelay={i * 180}
              scrollerRef={scrollerRef}
              scrollActive={scrollable}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Gallery photo tile ────────────────────────────────────────
function GalleryPhoto({ photo, alt, priority }: { photo: CategoryPhoto; alt: string; priority?: boolean }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
      <DriveImg
        src={photo.full}
        alt={alt}
        priority={priority}
        className="absolute inset-0 size-full object-cover object-center block"
        style={{ maxWidth: 'none' }}
      />
    </div>
  )
}

function GalleryNavChrome({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <div className="sticky top-0 z-20 w-full overflow-hidden">
      <div
        className="relative"
        style={{
          padding: 16,
          transform: visible ? 'translateY(0)' : 'translateY(-110%)',
          opacity: visible ? 1 : 0,
          transition: `transform ${GALLERY_NAV_MS}ms ease-in-out, opacity ${GALLERY_NAV_MS}ms ease-in-out`,
        }}
      >
        {/* Progressive blur 4→0 + black gradient @ 25% overall */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              maskImage: 'linear-gradient(to bottom, #000 0%, transparent 55%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 55%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              maskImage: 'linear-gradient(to bottom, transparent 15%, #000 35%, transparent 75%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 15%, #000 35%, transparent 75%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, #000 0%, transparent 100%)',
              opacity: 0.25,
            }}
          />
        </div>
        <div className="relative flex items-center w-full" style={{ gap: 8 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Screen 2 ─────────────────────────────────────────────────
function GalleryScreen({ category, onBack }: { category: CategoryData; onBack: () => void }) {
  const footerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [footerReady, setFooterReady] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [navIn, setNavIn] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [footerH, setFooterH] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) / WAVE_AR : 0)

  useLayoutEffect(() => {
    const measure = () => {
      if (footerRef.current) setFooterH(footerRef.current.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Header slide-in + start loading images in parallel with footer intro
  useEffect(() => {
    prefetchCategoryShare(category)
    for (const p of category.photos) {
      const img = new Image()
      img.src = p.full
    }
    const a = requestAnimationFrame(() => {
      setNavIn(true)
      setShowPhotos(true)
    })
    return () => cancelAnimationFrame(a)
  }, [category])

  useEffect(() => {
    document.title = `${category.galleryTitle} · Ritisha Creations`
    const cover = category.photos.find((p) => p.id === category.coverId) ?? category.photos[0]
    const setMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', prop)
        document.head.appendChild(el)
      }
      el.content = content
    }
    setMeta('og:title', category.galleryTitle)
    setMeta('og:description', 'Hey, check out this amazing piece by Ritisha Creations')
    setMeta('og:url', `${window.location.origin}${categoryPath(category.slug)}`)
    if (cover) setMeta('og:image', cover.full)
    return () => { document.title = 'Ritisha Creations' }
  }, [category])

  const onShare = useCallback(async () => {
    if (sharing) return
    setSharing(true)
    try { await shareCategory(category) }
    finally { setSharing(false) }
  }, [category, sharing])

  return (
    <div className="relative size-full overflow-hidden">
      <BgImage />
      <div ref={footerRef} className="absolute bottom-0 left-0 right-0 z-30">
        <GreenFooter
          label="DM us for more information"
          scrolled={footerReady ? scrolled : false}
          href={waUrl(waCategoryMsg(category.galleryTitle))}
          playIntro
          onIntroComplete={() => setFooterReady(true)}
        />
      </div>
      <div
        className="absolute inset-0 overflow-y-auto"
        style={{ paddingBottom: footerH }}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 8)}
      >
        <GalleryNavChrome visible={navIn}>
          <NavIconBtn label="Go back" onClick={onBack} src={iconBack} />
          <h1
            className="flex-1 min-w-0 m-0 text-center text-white"
            style={{
              fontFamily: FONT_SEMI,
              fontWeight: 670,
              fontSize: FS_CHROME,
              lineHeight: 'normal',
              letterSpacing: '-0.16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {category.galleryTitle}
          </h1>
          <NavIconBtn
            label={sharing ? 'Sharing…' : 'Share'}
            onClick={onShare}
            src={iconShare}
          />
        </GalleryNavChrome>
        <div
          className="flex flex-col"
          style={{
            gap: 16,
            opacity: showPhotos ? 1 : 0,
            transition: 'opacity 480ms ease-in-out',
          }}
        >
          {category.photos.map((photo, i) => (
            <GalleryPhoto
              key={photo.id}
              photo={photo}
              alt={`${category.galleryTitle} photo ${i + 1}`}
              priority={i < 2}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function pathSlug() {
  const raw = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (!raw || raw.includes('.')) return null
  return raw
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState<CategoryData | null>(null)
  const [visible,  setVisible]  = useState(true)
  const fontsReady = useFontsReady()
  const [categories, setCategories] = useState<CategoryData[]>(
    () => readCatalogueCache() ?? [],
  )
  const [catalogueReady, setCatalogueReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [bootDone, setBootDone] = useState(() => Boolean(pathSlug()))
  // introPhase waits until shloka finishes (unless deep-link skips boot)
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() =>
    pathSlug() ? 'trace' : 'wait',
  )

  useEffect(() => {
    let cancelled = false
    const deep = Boolean(pathSlug())

    ;(async () => {
      setLoadProgress(0.05)
      const { categories: next } = await loadCatalogue()
      if (cancelled) return
      setCategories(next)
      setCatalogueReady(true)
      setLoadProgress(0.35)

      const slug = pathSlug()
      if (slug) {
        const match = next.find((c) => c.slug === slug)
        if (match) setSelected(match)
      }

      const covers = next
        .map((c) => ({ cat: c, cover: c.photos.find((p) => p.id === c.coverId) ?? c.photos[0] }))
        .filter((x): x is { cat: CategoryData; cover: CategoryPhoto } => Boolean(x.cover))

      if (covers.length === 0) {
        setLoadProgress(1)
        return
      }

      let done = 0
      await Promise.all(
        covers.map(
          ({ cat, cover }) =>
            new Promise<void>((resolve) => {
              prefetchCategoryShare(cat)
              const img = new Image()
              const mark = () => {
                done += 1
                if (!cancelled) setLoadProgress(0.35 + 0.65 * (done / covers.length))
                resolve()
              }
              img.onload = mark
              img.onerror = mark
              img.src = cover.thumb
            }),
        ),
      )
      if (!cancelled) setLoadProgress(1)
    })()

    if (deep) {
      // Deep link: no shloka; still wait for fonts + catalogue before showing UI
      setBootDone(true)
    }

    return () => { cancelled = true }
  }, [])

  // Deep-link when cache already had categories before fetch finishes
  useEffect(() => {
    if (selected || !categories.length) return
    const slug = pathSlug()
    if (!slug) return
    const match = categories.find((c) => c.slug === slug)
    if (match) setSelected(match)
  }, [categories, selected])

  const onShlokaDone = useCallback(() => {
    setBootDone(true)
    setIntroPhase('trace')
  }, [])

  const navigate = useCallback((cat: CategoryData | null) => {
    setVisible(false)
    setTimeout(() => {
      setSelected(cat)
      const path = cat ? categoryPath(cat.slug) : '/'
      window.history.pushState({}, '', path)
      setVisible(true)
    }, 280)
  }, [])

  useEffect(() => {
    const onPop = () => {
      const slug = pathSlug()
      if (!slug) {
        setSelected(null)
        return
      }
      const match = categories.find((c) => c.slug === slug)
      setSelected(match ?? null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [categories])

  const contentReady = fontsReady && catalogueReady && (bootDone || Boolean(pathSlug()))
  const showShloka = !pathSlug() && !bootDone

  return (
    <div className="flex justify-center items-stretch min-h-[100dvh] bg-white">
      <div className="relative w-full max-w-[480px] h-[100dvh]">
        {showShloka && (
          <ShlokaIntro loadProgress={fontsReady ? loadProgress : Math.min(loadProgress, 0.2)} onDone={onShlokaDone} />
        )}
        <div className="absolute inset-0"
          style={{
            opacity: contentReady ? (visible ? 1 : 0) : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 280ms ease-in-out, transform 280ms ease-in-out',
          }}>
          {selected
            ? <GalleryScreen category={selected} onBack={() => navigate(null)} />
            : <HomeScreen
                categories={categories}
                onViewAll={(cat) => navigate(cat)}
                introPhase={introPhase}
                setIntroPhase={setIntroPhase}
              />}
        </div>
      </div>
    </div>
  )
}
