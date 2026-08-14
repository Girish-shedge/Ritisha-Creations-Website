/**
 * Rittisha Creations — all product UI in one file.
 *
 * READ ORDER FOR NEWCOMERS
 * 1. README.md / Project.md — why the app exists and how behaviour works
 * 2. App() at the bottom — catalogue load, shloka gate, home ↔ gallery nav
 * 3. HomeScreen / GalleryScreen — the two screens
 * 4. BlueHeader / GreenFooter / useChromeIntro — wave chrome animations
 * 5. DriveImg / CategoryCard — images and home cards
 *
 * SECTION MAP (search for "──")
 *   Design tokens / SVG paths     Header, footer, card frame geometry
 *   useChromeIntro                Shared stroke → fill → (marks) → text
 *   BlueHeader / GreenFooter      Sticky chrome (footer = WAVE_AR shell + h-full, always on gallery)
 *   HomeFooterBadge               End-of-list Handcrafted plaque (Figma 37:1377)
 *   HomeContactBar                Home Call + WhatsApp pills (52px / 52×52 compact)
 *   RotatingLines                 CTA / footer copy rotator
 *   DriveImg / Card* / PhotoLightbox  Photos, cards, gallery zoom viewer
 *   HomeScreen / GalleryScreen    Screens
 *   FlowerCurtain                 Home ↔ gallery marigold overlay
 *   App (default export)          Root
 *
 * See Project.md for mobile do-not-regress (footer CTA, card blur cuts, shloka glow).
 */
import { useState, useRef, useLayoutEffect, useEffect, useCallback, useId, useMemo } from 'react'
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
import iconSwastik from '@/assets/icons/swastik.svg'
import waFlower from '@/assets/icons/wa-flower.png'
import flowerYellow from '@/assets/flowers/flower-1.png'
import flowerOrange from '@/assets/flowers/flower-2.png'

const SLIDE_MS = 3500
const SLIDE_EASE_MS = 700
const CARD_ARM_MS = 500
const GALLERY_NAV_MS = 520

// ── Design tokens ─────────────────────────────────────────────
const FONT_BOLD = "'Season Mix-TRIAL:Bold', 'Poppins', sans-serif"
const FONT_SEMI = "'Season Mix-TRIAL:SemiBold', 'Poppins', sans-serif"
/** Home header + gallery footer wave fill (Figma 34:1373 / 35:1374) */
const CHROME_ORANGE = '#C3711A'
const CHROME_BROWN = '#913C16'
const FS_HEAD   = 36
const FS_CHROME = 16
const NAV_BTN = 48
const ICON_PX = 24
const HOME_PILL_H = 52

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
const CALL_NUMBER = '9272517248'
const HOME_WA_MSG = 'Hey, I am interested in the designs'
/** Home list bottom inset — Call/WhatsApp bar (52px pills) + gap */
const HOME_CONTACT_BAR_H = 124
/** Home list top inset under absolute header */
const HOME_SCROLL_PAD_TOP = 120
const HOME_BAR_SETTLE_MS = 1000
const HOME_BAR_EASE = '1000ms ease-in-out'
const HOME_PILL_SHADOW = '0px 4px 16px 0px rgba(0,0,0,0.15)'
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
const T_FILL_DUR  = 550
const T_MARK_DUR  = 420   // swastiks fade in at center
const T_TEXT_DUR  = 550   // swastiks split + title reveal
const T_HEADER_INTRO = T_TRACE_DUR + T_FILL_DUR + T_MARK_DUR + T_TEXT_DUR
/** Slide home cards in when header chrome is ~60% through. */
const T_CARDS_AT = Math.round(T_HEADER_INTRO * 0.6)
const T_CARDS_GAP = 900   // after cards start, then enable scroll

// ── Font-ready hook ───────────────────────────────────────────
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { document.fonts.ready.then(() => setReady(true)) }, [])
  return ready
}

/** Visible viewport box — take the smallest reported height so browser chrome cannot hide the gallery footer. */
function useVisualShell() {
  const read = () => {
    const vv = window.visualViewport
    const heights = [
      vv?.height,
      window.innerHeight,
      document.documentElement?.clientHeight,
    ].filter((n): n is number => typeof n === 'number' && n > 0)
    const widths = [
      vv?.width,
      window.innerWidth,
      document.documentElement?.clientWidth,
    ].filter((n): n is number => typeof n === 'number' && n > 0)
    return {
      top: vv?.offsetTop ?? 0,
      height: Math.min(...heights),
      width: Math.min(Math.min(...widths), 480),
    }
  }
  const [box, setBox] = useState(() =>
    typeof window !== 'undefined' ? read() : { top: 0, height: 800, width: 393 },
  )
  useEffect(() => {
    const sync = () => setBox(read())
    sync()
    window.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
    }
  }, [])
  return box
}

// ── Background ────────────────────────────────────────────────
function BgImage() {
  return (
    <img src={bgImg} alt="" aria-hidden
      loading="eager" fetchPriority="high" decoding="async"
      className="pointer-events-none absolute inset-0 size-full object-cover opacity-75"
    />
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

/**
 * stroke → fill → (optional marks) → text → done.
 * skipMarks: gallery footer (no swastiks). settleInstant: remount home after intro.
 */
type ChromeStep = 'stroke' | 'fill' | 'marks' | 'text' | 'done'
function useChromeIntro(
  play: boolean,
  onComplete?: () => void,
  opts: { settleInstant?: boolean; skipMarks?: boolean } = {},
) {
  const settleInstant = opts.settleInstant ?? false
  const skipMarks = opts.skipMarks ?? false
  const [step, setStep] = useState<ChromeStep>(settleInstant ? 'done' : 'stroke')
  const [traceGo, setTraceGo] = useState(settleInstant)
  const strokeDone = useRef(settleInstant)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const startedRef = useRef(settleInstant)

  useEffect(() => {
    if (!play) {
      // Allow a later play=true (gallery footer) to run the sequence again
      startedRef.current = false
      return
    }
    if (startedRef.current) return
    startedRef.current = true
    if (settleInstant) {
      strokeDone.current = true
      setTraceGo(true)
      setStep('done')
      return
    }
    strokeDone.current = false
    setTraceGo(false)
    setStep('stroke')
  }, [play, settleInstant])

  useEffect(() => {
    if (!play || settleInstant || step !== 'stroke') return
    strokeDone.current = false
    let id2 = 0
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setTraceGo(true))
    })
    return () => {
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
    }
  }, [play, settleInstant, step])

  useEffect(() => {
    if (!play || settleInstant || step !== 'stroke' || !traceGo) return
    const t = window.setTimeout(() => {
      if (strokeDone.current) return
      strokeDone.current = true
      setStep('fill')
    }, T_TRACE_DUR + 80)
    return () => clearTimeout(t)
  }, [play, settleInstant, step, traceGo])

  useEffect(() => {
    if (step !== 'fill') return
    const t = window.setTimeout(
      () => setStep(skipMarks ? 'text' : 'marks'),
      T_FILL_DUR,
    )
    return () => clearTimeout(t)
  }, [step, skipMarks])

  useEffect(() => {
    if (step !== 'marks') return
    const t = window.setTimeout(() => setStep('text'), T_MARK_DUR)
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
    if (!play || strokeDone.current || step !== 'stroke') return
    strokeDone.current = true
    setStep('fill')
  }

  const filled = step === 'fill' || step === 'marks' || step === 'text' || step === 'done'
  const marksOn = step === 'marks' || step === 'text' || step === 'done'
  const split = step === 'text' || step === 'done'

  return {
    step,
    traceGo,
    onStrokeTransitionEnd,
    showFill: filled,
    showMarks: marksOn,
    showText: split,
    settled: step === 'done' || (startedRef.current && filled),
    tracing: play && step === 'stroke' && !settleInstant,
    locked: step === 'done',
  }
}

function chromeInnerGlow(id: string) {
  return (
    <filter id={id} x="-12%" y="-20%" width="124%" height="150%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="blur" />
      <feComposite in="blur" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="inner" />
      <feFlood floodColor="#FFD7A0" floodOpacity="0.72" />
      <feComposite in2="inner" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="glow" />
      </feMerge>
    </filter>
  )
}

// ── Blue sticky header ────────────────────────────────────────
function BlueHeader({
  label, scrolled: _scrolled, playIntro, onIntroComplete, settleInstant = false,
}: {
  label: string
  scrolled: boolean
  playIntro: boolean
  onIntroComplete?: () => void
  /** Skip stroke/fill when remounting home after intro already finished. */
  settleInstant?: boolean
}) {
  const { traceGo, onStrokeTransitionEnd, showFill, showMarks, showText, settled, tracing, locked } =
    useChromeIntro(playIntro, onIntroComplete, { settleInstant })

  const stroke = strokeDrawProps({
    color: CHROME_ORANGE,
    go: traceGo,
    visible: tracing,
    duration: T_TRACE_DUR,
  })

  // Keep fill fully opaque once shown — never fade the header away.
  const fillOn = showFill || locked || settled

  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 size-full"
        viewBox="0 0 393 87.3859" preserveAspectRatio="none" fill="none">
          <path
            d={HEADER}
            fill="url(#blueHGrad)"
            stroke="url(#blueHStroke)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            filter={fillOn ? 'url(#blueHGlow)' : undefined}
            style={{
              fillOpacity: fillOn ? 1 : 0,
              strokeOpacity: fillOn ? 1 : 0,
              transition: `fill-opacity ${T_FILL_DUR}ms ease-in-out, stroke-opacity ${T_FILL_DUR}ms ease-in-out`,
            }}
          />
        <path d={HEADER_LEFT} {...stroke} onTransitionEnd={onStrokeTransitionEnd} />
        <path d={HEADER_RIGHT} {...stroke} />
        <defs>
          {chromeInnerGlow('blueHGlow')}
          <linearGradient id="blueHGrad" x1="196.5" y1="80.823" x2="196.5" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor={CHROME_ORANGE} /><stop offset="1" stopColor={CHROME_BROWN} />
          </linearGradient>
          {/* Figma 34:1373 — white highlight on the hanging bump, fades out upward */}
          <linearGradient id="blueHStroke" x1="196.5" y1="87.3867" x2="196.5" y2="35.3436" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      {/* Always centered as a group so swastiks + title stay balanced */}
      <div
        className="absolute z-10 pointer-events-none flex items-center"
        style={{
          top: '43.4%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          gap: showText ? 8 : 0,
          transition: `gap ${T_TEXT_DUR}ms ease-in-out`,
        }}
      >
        <img
          src={iconSwastik}
          alt=""
          width={16}
          height={16}
          className="block size-4 shrink-0"
          draggable={false}
          style={{
            opacity: showMarks ? 1 : 0,
            transition: `opacity ${T_MARK_DUR}ms ease-in-out`,
          }}
        />
        <span
          className="text-center text-white overflow-hidden whitespace-nowrap"
          style={{
            fontFamily: FONT_BOLD,
            fontWeight: 780,
            fontSize: FS_CHROME,
            lineHeight: 1.2,
            opacity: showText ? 1 : 0,
            maxWidth: showText ? 220 : 0,
            transition: [
              `opacity ${T_TEXT_DUR}ms ease-in-out`,
              `max-width ${T_TEXT_DUR}ms ease-in-out`,
            ].join(', '),
          }}
        >
          {label}
        </span>
        <img
          src={iconSwastik}
          alt=""
          width={16}
          height={16}
          className="block size-4 shrink-0"
          draggable={false}
          style={{
            opacity: showMarks ? 1 : 0,
            transition: `opacity ${T_MARK_DUR}ms ease-in-out`,
          }}
        />
      </div>
    </div>
  )
}

// ── Rotating line (subtle slide-up, ease-in-out, infinite) ────
const ROTATE_HOLD_MS = 2000
const ROTATE_MOVE_MS = 450
const ROTATE_NUDGE = '28%'

function RotatingLines({
  lines,
  style,
  active = true,
}: {
  lines: string[]
  style?: React.CSSProperties
  /** When false, show first line only (no rotation). */
  active?: boolean
}) {
  const [idx, setIdx] = useState(0)
  const [sliding, setSliding] = useState(false)

  useEffect(() => {
    if (!active || lines.length < 2) {
      setSliding(false)
      setIdx(0)
      return
    }
    const hold = setInterval(() => setSliding(true), ROTATE_HOLD_MS)
    return () => clearInterval(hold)
  }, [active, lines.length])

  useEffect(() => {
    if (!sliding) return
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % lines.length)
      setSliding(false)
    }, ROTATE_MOVE_MS)
    return () => clearTimeout(t)
  }, [sliding, lines.length])

  if (lines.length < 2) {
    return <span style={style}>{lines[0]}</span>
  }

  const cur = lines[idx]
  const next = lines[(idx + 1) % lines.length]
  const ease = `transform ${ROTATE_MOVE_MS}ms ease-in-out, opacity ${ROTATE_MOVE_MS}ms ease-in-out`

  return (
    <span
      className="relative block w-full overflow-hidden"
      style={{ height: '1.4em' }}
      aria-live="polite"
    >
      <span
        className="absolute inset-x-0 top-0 text-center"
        style={{
          ...style,
          transform: sliding ? `translateY(-${ROTATE_NUDGE})` : 'translateY(0)',
          opacity: sliding ? 0 : 1,
          transition: sliding ? ease : 'none',
        }}
      >
        {cur}
      </span>
      <span
        className="absolute inset-x-0 top-0 text-center"
        aria-hidden={!sliding}
        style={{
          ...style,
          transform: sliding ? 'translateY(0)' : `translateY(${ROTATE_NUDGE})`,
          opacity: sliding ? 1 : 0,
          transition: sliding ? ease : 'none',
        }}
      >
        {next}
      </span>
    </span>
  )
}

// ── Green sticky footer ───────────────────────────────────────
function GreenFooter({
  label, playIntro = false, onIntroComplete, visible = true, rotateActive = true, shellWidth,
}: {
  label: string | string[]
  playIntro?: boolean
  onIntroComplete?: () => void
  visible?: boolean
  /** When false, show first line only (no rotation). */
  rotateActive?: boolean
  /** Column width (visual viewport, capped at 480) — keeps wave height correct on phones. */
  shellWidth?: number
}) {
  const uid = useId().replace(/:/g, '')
  const { traceGo, onStrokeTransitionEnd, showFill, showText, settled, tracing, locked } =
    useChromeIntro(playIntro, onIntroComplete, { skipMarks: true })
  const labels = Array.isArray(label) ? label : [label]
  const aria = labels.join(' — ')
  // Explicit px height — aspect-ratio + % height collapses to 0 on some iOS WebViews
  const colW = shellWidth ?? Math.min(typeof window !== 'undefined' ? window.innerWidth : 393, 480)
  const waveH = Math.max(72, colW / WAVE_AR)

  const stroke = strokeDrawProps({
    color: CHROME_ORANGE,
    go: traceGo,
    visible: tracing,
    duration: T_TRACE_DUR,
  })

  const fillOn = showFill || locked || settled

  return (
    <div
      className="pointer-events-none block w-full" aria-label={aria} role="note"
      style={{
        visibility: visible ? 'visible' : 'hidden',
        // Lift wave above home indicator only — no solid pad under the footer
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxSizing: 'content-box',
      }}>
      <div
        className="relative w-full"
        style={{ height: waveH, minHeight: 72 }}
      >
        <svg className="absolute inset-0 size-full"
          viewBox="0 0 393 87.3859" preserveAspectRatio="none" fill="none"
          style={{ display: 'block' }}>
          <path
            d={FOOTER}
            fill={`url(#${uid}_grad)`}
            stroke={`url(#${uid}_stroke)`}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            filter={fillOn ? `url(#${uid}_glow)` : undefined}
            style={{
              fillOpacity: fillOn ? 1 : 0,
              strokeOpacity: fillOn ? 1 : 0,
              transition: `fill-opacity ${T_FILL_DUR}ms ease-in-out, stroke-opacity ${T_FILL_DUR}ms ease-in-out`,
            }}
          />
          <path d={FOOTER_LEFT} {...stroke} onTransitionEnd={onStrokeTransitionEnd} />
          <path d={FOOTER_RIGHT} {...stroke} />
          <defs>
            {chromeInnerGlow(`${uid}_glow`)}
            <linearGradient id={`${uid}_grad`} x1="196.5" y1="6.563" x2="196.5" y2="87.386" gradientUnits="userSpaceOnUse">
              <stop stopColor={CHROME_ORANGE} /><stop offset="1" stopColor={CHROME_BROWN} />
            </linearGradient>
            {/* Figma 35:1374 — white highlight on the rising bump, fades out downward */}
            <linearGradient id={`${uid}_stroke`} x1="196.5" y1="0" x2="196.5" y2="52.0431" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
        <span
          className="absolute left-0 right-0 z-10 pointer-events-none px-3 text-center"
          style={{
            bottom: '40%',
            transform: `translateY(50%) translateY(${showText ? 0 : 8}px)`,
            opacity: showText ? 1 : 0,
            transition: `opacity ${T_TEXT_DUR}ms ease-in-out, transform ${T_TEXT_DUR}ms ease-in-out`,
          }}
        >
          <RotatingLines
            lines={labels}
            active={rotateActive && showText}
            style={{
              fontFamily: FONT_BOLD,
              fontWeight: 780,
              fontSize: FS_CHROME,
              lineHeight: 1.4,
              color: '#fff',
            }}
          />
        </span>
      </div>
    </div>
  )
}

const HOME_BADGE_PATH =
  'M102.066 90.7594C110.211 75.6331 122.625 78.7644 171.226 84.3472C176.873 84.9958 181.824 80.5803 181.824 74.8964V68.1461C193.399 70.3657 204.132 61.4955 204.132 49.7098V41.0497C204.132 29.264 193.399 20.3938 181.824 22.6134V15.863C181.824 -10.3524 117.801 29.2214 102.066 0C86.403 29.0888 22.3079 -10.3074 22.3079 15.863V22.6134C10.7333 20.3935 0 29.264 0 41.0497V49.7098C0 61.4955 10.7333 70.3657 22.3079 68.1461V74.8964C22.3079 80.5803 27.2595 84.9958 32.9062 84.3472C81.562 78.7584 93.9471 75.6817 102.066 90.7594Z'

/** End-of-list Handcrafted plaque — Figma 37:1377. */
function HomeFooterBadge({ visible }: { visible: boolean }) {
  return (
    <div
      className="relative w-full flex justify-center"
      aria-label="Handcrafted and made with love"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 650ms ease-in-out, transform 650ms ease-in-out',
      }}
    >
      <div
        className="relative mx-auto"
        style={{
          width: 204,
          height: 91,
          filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.22))',
        }}
      >
        <svg
          viewBox="0 0 204.132 90.7594"
          width="204"
          height="91"
          className="absolute inset-0 block"
          aria-hidden
        >
          <defs>
            <linearGradient id="hcBadgeGrad" x1="102.066" y1="6.81642" x2="102.066" y2="90.7594" gradientUnits="userSpaceOnUse">
              <stop stopColor={CHROME_ORANGE} />
              <stop offset="1" stopColor={CHROME_BROWN} />
            </linearGradient>
            <linearGradient id="hcBadgeStroke" x1="102.066" y1="0" x2="102.066" y2="54.0522" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            <filter id="hcBadgeInner" x="-4%" y="-8%" width="108%" height="116%" filterUnits="objectBoundingBox">
              <feOffset dy="-2" />
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix values="0 0 0 0 0.423529 0 0 0 0 0.24543 0 0 0 0 0.0564706 0 0 0 1 0" />
              <feBlend in2="SourceGraphic" mode="normal" />
            </filter>
          </defs>
          <path
            filter="url(#hcBadgeInner)"
            fill="url(#hcBadgeGrad)"
            stroke="url(#hcBadgeStroke)"
            strokeWidth={2}
            d={HOME_BADGE_PATH}
          />
        </svg>
        {/* Optical center of the ornate plate (scallops bias visual mass upward) */}
        <div
          className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center text-center text-white pointer-events-none"
          style={{
            transform: 'translate(-50%, -46%)',
            width: '78%',
            textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            gap: 1,
          }}
        >
          <span style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: 16, lineHeight: 1.05 }}>
            Handcrafted
          </span>
          <span style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: 13, lineHeight: 1.05 }}>
            & made with love
          </span>
        </div>
      </div>
    </div>
  )
}

function NavIconBtn({
  label, onClick, src, href, background, insetShadow, flower,
}: {
  label: string
  onClick?: () => void
  src: string
  /** When set, render as link (e.g. WhatsApp). */
  href?: string
  background?: string
  insetShadow?: string
  /** Figma 40:1378 — 8-lobe flower chrome; shape spins, glyph stays upright. */
  flower?: boolean
}) {
  const className = 'relative flex items-center justify-center shrink-0 active:opacity-75'
  const style: React.CSSProperties = {
    width: NAV_BTN,
    height: NAV_BTN,
    overflow: flower ? 'visible' : 'hidden',
    borderRadius: flower ? 0 : 62,
    background: flower ? 'transparent' : (background ?? 'linear-gradient(to top, #000 12.393%, #333)'),
  }
  const inner = (
    <>
      {flower && (
        <img
          src={waFlower}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full"
          style={{ animation: 'wa-flower-spin 3.2s ease-in-out infinite' }}
          draggable={false}
        />
      )}
      {!flower && insetShadow && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[62px]"
          style={{ boxShadow: insetShadow }}
        />
      )}
      <img
        src={src}
        alt=""
        width={ICON_PX}
        height={ICON_PX}
        className="relative block"
        style={{ width: ICON_PX, height: ICON_PX }}
        draggable={false}
      />
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={className}
        style={style}
      >
        {inner}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={className}
      style={style}
    >
      {inner}
    </button>
  )
}

/** Home-only Call + WhatsApp bar. Height 52; compact circles are 52×52. */
function HomeContactBar({ compact, visible }: { compact: boolean; visible: boolean }) {
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef(0)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1800)
  }

  const onCall = async () => {
    try {
      await navigator.clipboard?.writeText(CALL_NUMBER)
    } catch {
      // clipboard may be denied; still open dialer
    }
    showToast('Number copied')
    window.setTimeout(() => {
      window.location.href = `tel:+91${CALL_NUMBER}`
    }, 180)
  }

  const ease = HOME_BAR_EASE
  const pillStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    height: HOME_PILL_H,
    width: compact ? HOME_PILL_H : undefined,
    flex: compact ? `0 0 ${HOME_PILL_H}px` : '1 1 0%',
    gap: compact ? 0 : 4,
    padding: compact ? 0 : '0 16px',
    borderRadius: 40,
    boxShadow: HOME_PILL_SHADOW,
    transition: `flex ${ease}, width ${ease}, padding ${ease}, gap ${ease}, box-shadow ${ease}`,
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    letterSpacing: -0.16,
    color: '#fff',
    lineHeight: 'normal',
    whiteSpace: 'nowrap',
    maxWidth: compact ? 0 : 160,
    opacity: compact ? 0 : 1,
    overflow: 'hidden',
    transition: `max-width ${ease}, opacity ${ease}`,
  }
  const iconBox: React.CSSProperties = {
    width: ICON_PX,
    height: ICON_PX,
    padding: 0,
    flexShrink: 0,
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity ${ease}, transform ${ease}`,
        pointerEvents: visible ? undefined : 'none',
      }}
      aria-hidden={!visible}
    >
      <div
        className="pointer-events-auto relative flex w-full flex-row items-center justify-between gap-6 px-4 py-6"
        data-name="Bottom Bar"
        style={{ pointerEvents: visible ? 'auto' : 'none' }}
      >
        {toast && (
          <div
            className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1.5 text-[13px] text-white"
            style={{
              bottom: 'calc(100% - 8px)',
              background: 'rgba(0,0,0,0.78)',
              fontFamily: FONT_SEMI,
            }}
            role="status"
          >
            {toast}
          </div>
        )}
        <button type="button" style={pillStyle} onClick={onCall} aria-label={`Call ${CALL_NUMBER}`}>
          <span
            aria-hidden
            className="absolute inset-0 rounded-[40px]"
            style={{ background: 'linear-gradient(to bottom, #0e62ec, #0b4ebc)' }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-[40px]"
            style={{ boxShadow: 'inset 0px -2px 8px 0px #3a80f3' }}
          />
          <span className="relative shrink-0 overflow-hidden" style={iconBox}>
            <img src="/icons/icon-phone.svg" alt="" className="block size-full" width={ICON_PX} height={ICON_PX} />
          </span>
          <span className="relative" style={labelStyle} aria-hidden={compact}>
            {CALL_NUMBER}
          </span>
        </button>
        <a
          style={pillStyle}
          href={waUrl(HOME_WA_MSG)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${WA_NUMBER.slice(2)}`}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-[40px]"
            style={{ background: 'linear-gradient(to bottom, #25d366, #1ea952)' }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-[40px]"
            style={{ boxShadow: 'inset 0px -2px 8px 0px rgba(77,224,132,0.5)' }}
          />
          <span className="relative shrink-0 overflow-hidden" style={iconBox}>
            <img src="/icons/icon-whatsapp.svg" alt="" className="block size-full" width={ICON_PX} height={ICON_PX} />
          </span>
          <span className="relative" style={labelStyle} aria-hidden={compact}>
            {WA_NUMBER.slice(2)}
          </span>
        </a>
      </div>
    </div>
  )
}

// Session image cache — only URLs that actually decoded.
const imgReady = new Set<string>()
const imgFailed = new Set<string>()

function warmImage(src: string) {
  if (!src || imgReady.has(src) || imgFailed.has(src)) return
  const img = new Image()
  img.onload = () => {
    if (img.naturalWidth > 0) imgReady.add(src)
    else imgFailed.add(src)
  }
  img.onerror = () => { imgFailed.add(src) }
  img.src = src
}

function warmCategoryImages(category: CategoryData) {
  // Thumbs only — fulls load on gallery open (avoid flooding the network on home).
  for (const p of category.photos) warmImage(p.thumb)
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
  const candidates = useMemo(() => {
    // Prefer CDN; keep same-origin proxy as last resort for stubborn files.
    if (src.includes('lh3.googleusercontent.com/d/')) {
      const id = src.match(/\/d\/([^/=]+)/)?.[1]
      if (id) {
        return [
          src,
          `https://lh3.googleusercontent.com/d/${id}=w1600`,
          `/api/media?id=${encodeURIComponent(id)}`,
        ]
      }
    }
    const m = /[?&]id=([^&]+)/.exec(src)
    const id = m?.[1] ? decodeURIComponent(m[1]) : ''
    if (!id) return [src]
    return [
      `https://lh3.googleusercontent.com/d/${id}=w1200`,
      `/api/media?id=${encodeURIComponent(id)}`,
      src,
    ]
  }, [src])

  const [idx, setIdx] = useState(0)
  const activeSrc = candidates[Math.min(idx, candidates.length - 1)] ?? src
  const [loaded, setLoaded] = useState(() => imgReady.has(activeSrc))
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIdx(0)
    setLoaded(imgReady.has(candidates[0] ?? src))
    setFailed(false)
  }, [src, candidates, src])

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    if (el.complete && el.naturalWidth > 0) {
      imgReady.add(activeSrc)
      setLoaded(true)
      setFailed(false)
    }
  }, [activeSrc])

  const markOk = () => {
    imgReady.add(activeSrc)
    imgFailed.delete(activeSrc)
    setLoaded(true)
    setFailed(false)
  }

  const markFail = () => {
    imgFailed.add(activeSrc)
    imgReady.delete(activeSrc)
    if (idx + 1 < candidates.length) {
      setIdx((i) => i + 1)
      setLoaded(false)
      return
    }
    setLoaded(false)
    setFailed(true)
  }

  const showPhoto = loaded && !failed

  return (
    <div
      className={className}
      style={{
        ...style,
        background: '#fff',
      }}
      aria-busy={!showPhoto}
    >
      {/* Same श्री placeholder as gallery tiles — no peach wash that reads as an orange box */}
      <img
        src={placeholderImg}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover object-center block"
        style={{
          maxWidth: 'none',
          opacity: showPhoto ? 0 : 1,
          transition: 'opacity 280ms ease-in-out',
        }}
        draggable={false}
      />
      {!failed && (
        <img
          key={activeSrc}
          ref={imgRef}
          src={activeSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center block"
          style={{
            maxWidth: 'none',
            opacity: showPhoto ? 1 : 0,
            transition: 'opacity 280ms ease-in-out',
          }}
          draggable={false}
          onLoad={markOk}
          onError={markFail}
        />
      )}
    </div>
  )
}

// ── Card blur overlay (soft progressive blur, clipped to card frame cuts) ──
function CardBlurOverlay({ uid }: { uid: string }) {
  const gradId = `cGrad_${uid}`
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{
        // Same corner cuts as the photo — keeps blur/scrim inside the frame
        WebkitMaskImage: CARD_FRAME_MASK,
        maskImage: CARD_FRAME_MASK,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      }}
    >
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '36%' }}>
        {/* Softer progressive blur 0 → ~2.5 (was 4). May no-op under mask on some iOS; scrim still clips. */}
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(2.5px)',
            WebkitBackdropFilter: 'blur(2.5px)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(1.25px)',
            WebkitBackdropFilter: 'blur(1.25px)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 55%, #000 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 55%, #000 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.14) 48%, transparent 100%)',
          }}
        />
        <svg className="absolute inset-0 size-full" viewBox="0 0 361 120" preserveAspectRatio="none" fill="none" aria-hidden>
          <path d={CARD_OVERLAY} fill={`url(#${gradId})`} fillOpacity="0.2" />
          <defs>
            <linearGradient id={gradId} x1="180.5" y1="120" x2="180.5" y2="0" gradientUnits="userSpaceOnUse">
              <stop /><stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
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
  photos, alt, onIndexChange, autoplay, onOpen,
}: {
  photos: CategoryPhoto[]
  alt: string
  onIndexChange?: (i: number) => void
  /** true after the card has stayed centred ≥1s */
  autoplay: boolean
  /** Tap (not swipe) opens gallery — parent always opens at Image 1. */
  onOpen?: () => void
}) {
  const n = photos.length
  const track = n > 1 ? [...photos, photos[0]] : photos
  const [i, setI] = useState(0)
  const [anim, setAnim] = useState(true)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [manual, setManual] = useState(false)
  const startPtr = useRef<{ x: number; y: number; t: number } | null>(null)
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
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startPtr.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    if (n <= 1) return
    setDragging(true)
    setDrag(0)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startPtr.current || n <= 1) return
    setDrag(e.clientX - startPtr.current.x)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = startPtr.current
    startPtr.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    setDragging(false)
    setDrag(0)
    if (n > 1 && Math.abs(dx) > 40 && Math.abs(dx) >= Math.abs(dy)) {
      goBy(dx < 0 ? 1 : -1)
      return
    }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && Date.now() - s.t < 450) {
      onOpen?.()
    }
  }

  const width = typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) : 360
  const pct = i * 100 - (drag / Math.max(width, 1)) * 100

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? `Open ${alt} gallery` : undefined}
      onKeyDown={onOpen ? (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          onOpen()
        }
      } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'pan-y', cursor: onOpen ? 'pointer' : undefined }}
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
  const [slide, setSlide] = useState(0)
  const [armed, setArmed] = useState(false)
  const onSlide = useCallback((i: number) => setSlide(i), [])

  // Autoplay after the card has been mostly in view for 0.5s
  useEffect(() => {
    if (!scrollActive) {
      setArmed(false)
      return
    }
    const card = cardRef.current
    const root = scrollerRef.current
    if (!card || !root) return
    let timer = 0
    const obs = new IntersectionObserver(
      ([e]) => {
        window.clearTimeout(timer)
        if (e.isIntersecting && e.intersectionRatio >= 0.55) {
          timer = window.setTimeout(() => setArmed(true), CARD_ARM_MS)
        } else {
          setArmed(false)
        }
      },
      { root, threshold: [0, 0.55, 0.75, 1] },
    )
    obs.observe(card)
    return () => {
      obs.disconnect()
      window.clearTimeout(timer)
    }
  }, [scrollActive, scrollerRef])

  return (
    <div
      ref={cardRef}
      className="flex flex-col gap-4 items-center w-full"
      style={{
        opacity: introVisible ? 1 : 0,
        transform: introVisible ? 'translateY(0)' : 'translateY(52px)',
        transition: `opacity 650ms ease-in-out ${introDelay}ms, transform 650ms ease-in-out ${introDelay}ms`,
      }}>
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '1 / 1' }}
      >
        <div
          className="absolute inset-0"
          style={{
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
            onOpen={onViewAll}
          />
        </div>
        {/* Blur sits outside the frame mask — ancestor masks kill backdrop-filter */}
        <CardBlurOverlay uid={category.id} />
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end z-10 pb-4 pointer-events-none"
          style={{ paddingLeft: 24, paddingRight: 24, gap: 12 }}>
          <CardDots count={category.photos.length} active={slide} />
          <div className="flex flex-col items-center w-full">
            <p
              className="text-white text-center leading-tight m-0 w-full"
              style={{
                fontFamily: FONT_BOLD,
                fontWeight: 780,
                fontSize: FS_HEAD,
                textShadow: '0 1px 3px rgba(0,0,0,0.45)',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
              {category.galleryTitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Screen 1 ─────────────────────────────────────────────────
interface HomeScreenProps {
  categories: CategoryData[]
  onViewAll: (cat: CategoryData) => void
  introPhase: IntroPhase
  setIntroPhase: (p: IntroPhase) => void
  /** Restored after back-from-gallery; undefined = leave at top. */
  restoreScrollTop?: number
  onScrollTopChange?: (y: number) => void
}
function HomeScreen({
  categories, onViewAll, introPhase, setIntroPhase, restoreScrollTop, onScrollTopChange,
}: HomeScreenProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const restoredRef = useRef(false)
  const barCompactTimer = useRef(0)
  const barExpandTimer = useRef(0)
  const [scrolled, setScrolled] = useState(false)
  const [barCompact, setBarCompact] = useState(false)

  const pastChrome = introPhase === 'cards' || introPhase === 'done'
  const [headerPlay, setHeaderPlay] = useState(
    () => introPhase === 'trace' || pastChrome,
  )

  useEffect(() => {
    if (introPhase === 'trace' || introPhase === 'cards' || introPhase === 'done') {
      setHeaderPlay(true)
    }
  }, [introPhase])

  const onHeaderIntroComplete = useCallback(() => {
    // Fallback if the 60% timer already promoted to cards
    setIntroPhase('cards')
  }, [setIntroPhase])

  // Start card slide-in at 60% of the header chrome timeline (not after it finishes)
  useEffect(() => {
    if (introPhase !== 'trace') return
    const t = window.setTimeout(() => setIntroPhase('cards'), T_CARDS_AT)
    return () => clearTimeout(t)
  }, [introPhase, setIntroPhase])

  useEffect(() => {
    if (introPhase !== 'cards') return
    const t = window.setTimeout(() => setIntroPhase('done'), T_CARDS_GAP)
    return () => clearTimeout(t)
  }, [introPhase, setIntroPhase])

  useEffect(() => () => {
    window.clearTimeout(barCompactTimer.current)
    window.clearTimeout(barExpandTimer.current)
  }, [])

  // Instant scroll restore when returning from gallery (no ease animation)
  useLayoutEffect(() => {
    if (restoredRef.current) return
    if (restoreScrollTop == null || restoreScrollTop <= 0) return
    if (introPhase !== 'done') return
    const el = scrollerRef.current
    if (!el) return
    restoredRef.current = true
    el.scrollTop = restoreScrollTop
    setScrolled(restoreScrollTop > 8)
  }, [restoreScrollTop, introPhase])

  const cardsVisible = introPhase === 'cards' || introPhase === 'done'
  const scrollable = introPhase === 'done'
  const contactVisible = introPhase === 'done'

  return (
    <div className="relative size-full overflow-hidden">
      <BgImage />

      <div className="absolute top-0 left-0 right-0 z-30" style={{ aspectRatio: `${WAVE_AR}` }}>
        <BlueHeader
          label="Rittisha Creations"
          scrolled={scrolled}
          playIntro={headerPlay}
          settleInstant={pastChrome}
          onIntroComplete={onHeaderIntroComplete}
        />
      </div>

      <div
        ref={scrollerRef}
        className="absolute inset-0 overflow-y-auto scroll-smooth"
        style={{
          paddingTop: HOME_SCROLL_PAD_TOP,
          paddingBottom: `calc(${HOME_CONTACT_BAR_H}px + env(safe-area-inset-bottom, 0px))`,
          overflowY: scrollable ? 'auto' : 'hidden',
        }}
        onScroll={(e) => {
          if (!scrollable) return
          const y = e.currentTarget.scrollTop
          setScrolled(y > 8)
          onScrollTopChange?.(y)
          window.clearTimeout(barExpandTimer.current)
          if (!barCompactTimer.current) {
            barCompactTimer.current = window.setTimeout(() => {
              barCompactTimer.current = 0
              setBarCompact(true)
            }, HOME_BAR_SETTLE_MS)
          }
          barExpandTimer.current = window.setTimeout(() => {
            window.clearTimeout(barCompactTimer.current)
            barCompactTimer.current = 0
            setBarCompact(false)
          }, HOME_BAR_SETTLE_MS)
        }}
      >
        <div className="flex w-full flex-col gap-10 items-center px-4 pt-4">
          {categories.map((cat, i) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onViewAll={() => onViewAll(cat)}
              introVisible={cardsVisible}
              introDelay={(i + 1) * 180}
              scrollerRef={scrollerRef}
              scrollActive={scrollable}
            />
          ))}
          <HomeFooterBadge visible={cardsVisible} />
        </div>
      </div>

      <HomeContactBar compact={barCompact} visible={contactVisible} />
    </div>
  )
}

// ── Gallery photo lightbox (phone-first) ──────────────────────
const LB_MAX = 4
const LB_DBL = 2.5
const LB_IN_MS = 420
const LB_OUT_MS = 340
const LB_SLIDE_MS = 380
/** Soft bounce + ease-in-out for focus in/out */
const LB_BOUNCE = 'cubic-bezier(0.34, 1.4, 0.64, 1)'
const LB_SLIDE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/** Keep zoomed image edges from leaving the viewport box. */
function clampPan(scale: number, tx: number, ty: number, size: number) {
  const max = Math.max(0, (size * (scale - 1)) / 2)
  return {
    tx: Math.min(max, Math.max(-max, tx)),
    ty: Math.min(max, Math.max(-max, ty)),
  }
}

/** Infinite track: [last, ...photos, first]. Real index from track slot. */
function lbRealIndex(n: number, trackI: number) {
  if (n <= 1) return 0
  return ((trackI - 1) % n + n) % n
}
function lbStartTrack(n: number, index: number) {
  return n > 1 ? index + 1 : 0
}
function lbSnapTrack(n: number, trackI: number) {
  if (n <= 1) return trackI
  if (trackI === 0) return n
  if (trackI === n + 1) return 1
  return trackI
}
{
  const a = lbRealIndex(3, 0) === 2 && lbRealIndex(3, 1) === 0 && lbRealIndex(3, 4) === 0
  const b = lbSnapTrack(3, 0) === 3 && lbSnapTrack(3, 4) === 1 && lbSnapTrack(3, 2) === 2
  if (!a || !b) throw new Error('lightbox wrap check failed')
}

function PhotoLightbox({
  photos, index, alt, onClose,
}: {
  photos: CategoryPhoto[]
  index: number
  alt: string
  onClose: () => void
}) {
  const n = photos.length
  const looped = n > 1
  const slides = useMemo(
    () => (looped ? [photos[n - 1], ...photos, photos[0]] : photos),
    [photos, n, looped],
  )
  const slideN = slides.length
  const [trackI, setTrackI] = useState(() => lbStartTrack(n, index))
  const [noEase, setNoEase] = useState(false)
  const i = lbRealIndex(n, trackI)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [gesturing, setGesturing] = useState(false)
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const zoomed = scale > 1.05
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxSize, setBoxSize] = useState(320)

  const ptr = useRef<{
    mode: 'none' | 'pan' | 'swipe' | 'pinch'
    x0: number
    y0: number
    tx0: number
    ty0: number
    s0: number
    pinDist: number
    lastTap: number
  }>({ mode: 'none', x0: 0, y0: 0, tx0: 0, ty0: 0, s0: 1, pinDist: 0, lastTap: 0 })
  const touches = useRef<Map<number, { x: number; y: number }>>(new Map())
  const closeTimer = useRef(0)

  const resetZoom = useCallback(() => {
    setScale(1)
    setTx(0)
    setTy(0)
    setDragX(0)
    setDragY(0)
  }, [])

  const applyPan = useCallback((nx: number, ny: number, s = scale) => {
    const c = clampPan(s, nx, ny, boxSize)
    setTx(c.tx)
    setTy(c.ty)
  }, [scale, boxSize])

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setBoxSize(el.clientWidth || 320)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShown(true))
    })
    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    resetZoom()
  }, [trackI, resetZoom])

  const onTrackEnd = () => {
    if (!looped) return
    const snapped = lbSnapTrack(n, trackI)
    if (snapped === trackI) return
    setNoEase(true)
    setTrackI(snapped)
  }

  useLayoutEffect(() => {
    if (!noEase) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setNoEase(false))
    })
    return () => cancelAnimationFrame(id)
  }, [noEase])

  const requestClose = useCallback(() => {
    if (leaving) return
    setLeaving(true)
    setShown(false)
    resetZoom()
    closeTimer.current = window.setTimeout(onClose, LB_OUT_MS)
  }, [leaving, onClose, resetZoom])

  const go = useCallback((dir: number) => {
    if (n <= 1 || leaving || scale > 1.05) return
    if (looped && (trackI === 0 || trackI === n + 1)) return
    setNoEase(false)
    setTrackI((v) => v + dir)
    setDragX(0)
    setDragY(0)
  }, [n, leaving, scale, looped, trackI])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
      if (leaving || zoomed) return
      if (e.key === 'ArrowRight' && n > 1) go(1)
      if (e.key === 'ArrowLeft' && n > 1) go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [requestClose, go, n, leaving, zoomed])

  const onPointerDown = (e: React.PointerEvent) => {
    if (leaving) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = ptr.current
    setGesturing(true)

    if (touches.current.size === 2) {
      const pts = [...touches.current.values()]
      g.mode = 'pinch'
      g.pinDist = dist2(pts[0], pts[1]) || 1
      g.s0 = scale
      g.tx0 = tx
      g.ty0 = ty
      return
    }

    g.x0 = e.clientX
    g.y0 = e.clientY
    g.tx0 = tx
    g.ty0 = ty
    g.mode = zoomed ? 'pan' : 'swipe'
    setDragX(0)
    setDragY(0)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!touches.current.has(e.pointerId) || leaving) return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = ptr.current

    if (touches.current.size >= 2 || g.mode === 'pinch') {
      const pts = [...touches.current.values()]
      if (pts.length < 2) return
      const d = dist2(pts[0], pts[1]) || 1
      if (g.mode !== 'pinch') {
        g.mode = 'pinch'
        g.pinDist = d
        g.s0 = scale
        g.tx0 = tx
        g.ty0 = ty
      }
      const next = Math.min(LB_MAX, Math.max(1, g.s0 * (d / g.pinDist)))
      setScale(next)
      applyPan(g.tx0, g.ty0, next)
      return
    }

    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0
    if (g.mode === 'pan') {
      applyPan(g.tx0 + dx, g.ty0 + dy)
      return
    }
    if (g.mode === 'swipe') {
      setDragX(dx)
      setDragY(dy)
    }
  }

  const endPointer = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId)
    const g = ptr.current

    if (touches.current.size >= 1) {
      const rem = [...touches.current.values()][0]
      if (rem) {
        g.mode = scale > 1.05 ? 'pan' : 'swipe'
        g.x0 = rem.x
        g.y0 = rem.y
        g.tx0 = tx
        g.ty0 = ty
        setDragX(0)
        setDragY(0)
      }
      return
    }

    const mode = g.mode
    g.mode = 'none'
    setGesturing(false)
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0
    setDragX(0)
    setDragY(0)
    if (leaving) return

    const isTap = Math.abs(dx) < 10 && Math.abs(dy) < 10
    const maybeToggleZoom = () => {
      if (!isTap) return false
      const now = Date.now()
      if (now - g.lastTap < 320) {
        g.lastTap = 0
        if (scale > 1.1) resetZoom()
        else {
          setScale(LB_DBL)
          applyPan(0, 0, LB_DBL)
        }
        return true
      }
      g.lastTap = now
      return false
    }

    if (mode === 'pinch') {
      if (scale < 1.08) resetZoom()
      else applyPan(tx, ty, scale)
      return
    }
    if (mode === 'pan') {
      if (maybeToggleZoom()) return
      applyPan(tx, ty, scale)
      return
    }

    if (mode === 'swipe') {
      if (dy > 90 && dy > Math.abs(dx) * 1.15) {
        requestClose()
        return
      }
      if (n > 1 && Math.abs(dx) > Math.max(48, boxSize * 0.18) && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1)
        return
      }
      maybeToggleZoom()
    }
  }

  const focusOn = shown && !leaving
  const backdropOp = focusOn
    ? (zoomed ? 1 : Math.max(0.4, 1 - Math.abs(dragY) / 280))
    : 0
  const focusEase = leaving
    ? `transform ${LB_OUT_MS}ms ${LB_BOUNCE}, opacity ${LB_OUT_MS}ms ease-in-out`
    : `transform ${LB_IN_MS}ms ${LB_BOUNCE}, opacity ${LB_IN_MS}ms ease-in-out`
  const trackEase = gesturing || noEase ? 'none' : `transform ${LB_SLIDE_MS}ms ${LB_SLIDE_EASE}`

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal={true}
      aria-label="Photo viewer"
      style={{ left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480 }}
    >
      <button
        type="button"
        aria-label="Close photo"
        className="absolute inset-0 border-0 p-0 cursor-pointer"
        style={{
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          opacity: backdropOp,
          transition: `opacity ${leaving ? LB_OUT_MS : LB_IN_MS}ms ease-in-out`,
        }}
        onClick={requestClose}
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3">
        <div
          ref={boxRef}
          className="pointer-events-auto relative overflow-hidden"
          style={{
            width: 'min(100%, 100dvh - 48px)',
            maxWidth: '100%',
            aspectRatio: '1 / 1',
            touchAction: 'none',
            borderRadius: 4,
            opacity: focusOn ? 1 : 0,
            transform: focusOn
              ? `translateY(${zoomed ? 0 : dragY}px) scale(1)`
              : 'translateY(18px) scale(0.86)',
            transition: focusEase,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <div
            className="absolute inset-y-0 left-0 flex h-full"
            onTransitionEnd={(e) => {
              if (e.target !== e.currentTarget) return
              if (e.propertyName !== 'transform') return
              onTrackEnd()
            }}
            style={{
              width: `${slideN * 100}%`,
              transform: `translateX(calc(-${trackI * (100 / slideN)}% + ${zoomed ? 0 : dragX}px))`,
              transition: trackEase,
              willChange: 'transform',
            }}
          >
            {slides.map((photo, idx) => (
              <div
                key={`${photo.id}-${idx}`}
                className="relative h-full shrink-0 grow-0 overflow-hidden"
                style={{ flexBasis: `${100 / slideN}%`, width: `${100 / slideN}%` }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    transform: idx === trackI
                      ? `translate(${tx}px, ${ty}px) scale(${scale})`
                      : 'none',
                    transition: gesturing ? 'none' : `transform ${LB_SLIDE_MS}ms ${LB_SLIDE_EASE}`,
                    transformOrigin: 'center center',
                    willChange: idx === trackI ? 'transform' : undefined,
                  }}
                >
                  <DriveImg
                    src={photo.full}
                    alt={`${alt} photo ${lbRealIndex(n, idx) + 1}`}
                    priority={Math.abs(idx - trackI) <= 1}
                    className="absolute inset-0 size-full object-contain object-center block"
                    style={{ maxWidth: 'none' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {n > 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center gap-1.5 pb-[max(20px,env(safe-area-inset-bottom))]"
          aria-hidden
          style={{
            opacity: focusOn ? 1 : 0,
            transition: `opacity ${leaving ? LB_OUT_MS : LB_IN_MS}ms ease-in-out`,
          }}
        >
          {photos.map((p, idx) => (
            <span
              key={p.id}
              className="block rounded-full"
              style={{
                width: idx === i ? 12 : 4,
                height: 4,
                background: idx === i ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'width 200ms ease-in-out',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Gallery photo tile ────────────────────────────────────────
function GalleryPhoto({
  photo, alt, priority, onOpen,
}: {
  photo: CategoryPhoto
  alt: string
  priority?: boolean
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${alt}`}
      className="relative w-full overflow-hidden border-0 p-0 block cursor-zoom-in bg-transparent"
      style={{ aspectRatio: '1 / 1' }}
    >
      <DriveImg
        src={photo.full}
        alt={alt}
        priority={priority}
        className="absolute inset-0 size-full object-cover object-center block"
        style={{ maxWidth: 'none' }}
      />
    </button>
  )
}

function GalleryNavChrome({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 w-full overflow-hidden pointer-events-none">
      <div
        className="relative pointer-events-auto"
        style={{
          padding: 16,
          transform: visible ? 'translateY(0)' : 'translateY(-110%)',
          opacity: visible ? 1 : 0,
          transition: `transform ${GALLERY_NAV_MS}ms ease-in-out, opacity ${GALLERY_NAV_MS}ms ease-in-out`,
        }}
      >
        {/* Progressive blur 12→0 + black gradient @ 25% overall */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              maskImage: 'linear-gradient(to bottom, #000 0%, transparent 55%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 55%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
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
function GalleryScreen({ category, onBack, shellWidth }: {
  category: CategoryData
  onBack: () => void
  shellWidth: number
}) {
  const [footerReady, setFooterReady] = useState(false)
  const [rotateReady, setRotateReady] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [navIn, setNavIn] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  // Nav intro after paint; warm gallery images into session cache
  useEffect(() => {
    setFooterReady(false)
    setRotateReady(false)
    setNavIn(false)
    setShowPhotos(false)
    setLightbox(null)

    prefetchCategoryShare(category)
    warmCategoryImages(category)

    let cancelled = false
    let id2 = 0
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        if (cancelled) return
        setNavIn(true)
        setShowPhotos(true)
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
    }
  }, [category])

  // After footer chrome intro completes, wait 0.5s before rotating copy
  useEffect(() => {
    if (!footerReady) {
      setRotateReady(false)
      return
    }
    const t = window.setTimeout(() => setRotateReady(true), CARD_ARM_MS)
    return () => clearTimeout(t)
  }, [footerReady])

  useEffect(() => {
    document.title = `${category.galleryTitle} · Rittisha Creations`
    const brandImage = `${window.location.origin}/icons/og-image.png`
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
    setMeta('og:description', 'Hey, check out this amazing piece by Rittisha Creations')
    setMeta('og:url', `${window.location.origin}${categoryPath(category.slug)}`)
    setMeta('og:image', brandImage)
    return () => { document.title = 'Rittisha Creations' }
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
      <GalleryNavChrome visible={navIn}>
        <NavIconBtn label="Go back" onClick={onBack} src={iconBack} />
        <h1
          className="flex-1 min-w-0 m-0 text-left text-white"
          style={{
            fontFamily: FONT_SEMI,
            fontWeight: 670,
            fontSize: FS_CHROME,
            lineHeight: 'normal',
            letterSpacing: '-0.16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingLeft: 4,
            paddingRight: 8,
          }}
        >
          {category.galleryTitle}
        </h1>
        <div className="flex shrink-0 items-center" style={{ gap: 12 }}>
          <NavIconBtn
            label={sharing ? 'Sharing…' : 'Share'}
            onClick={onShare}
            src={iconShare}
          />
          <NavIconBtn
            label={`WhatsApp about ${category.galleryTitle}`}
            src="/icons/icon-whatsapp.svg"
            href={waUrl(waCategoryMsg(category.galleryTitle))}
            background="linear-gradient(to bottom, #25d366, #1ea952)"
            insetShadow="inset 0px -2px 8px 0px rgba(77,224,132,0.5)"
            flower
          />
        </div>
      </GalleryNavChrome>
      <div className="absolute inset-0 z-10 overflow-y-auto">
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
              onOpen={() => setLightbox(i)}
            />
          ))}
        </div>
      </div>
      {lightbox != null && (
        <PhotoLightbox
          photos={category.photos}
          index={lightbox}
          alt={category.galleryTitle}
          onClose={() => setLightbox(null)}
        />
      )}
      {/* Fixed to the visible viewport bottom — survives 100vh / WebView chrome bugs */}
      <div
        className="pointer-events-none"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div className="pointer-events-none w-full max-w-[480px]">
          <GreenFooter
            key={category.id}
            label={[
              'Customization also available',
              'Prices starting from ₹499',
            ]}
            playIntro
            onIntroComplete={() => setFooterReady(true)}
            rotateActive={rotateReady}
            shellWidth={shellWidth}
          />
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

// ── Flower curtain (home ↔ gallery) ───────────────────────────
type FlowerCell = {
  x: number
  y: number
  rot: number
  sc: number
  kind: 0 | 1
  delay: number
  z: number
}

const FLOWER_SRC = [flowerYellow, flowerOrange] as const
const FLOWER_GROW_MS = 520
const FLOWER_GROW_STAGGER = 400
const FLOWER_FADE_MS = 460
const FLOWER_FADE_STAGGER = 320
const FLOWER_GROW_TOTAL = FLOWER_GROW_MS + FLOWER_GROW_STAGGER
const FLOWER_FADE_TOTAL = FLOWER_FADE_MS + FLOWER_FADE_STAGGER

function flowerSizeFor(w: number) {
  return Math.round(Math.min(210, Math.max(160, w * 0.46)))
}

function packFlowerWall(w: number, h: number, size: number): FlowerCell[] {
  const colGap = size * 0.56
  const rowGap = size * 0.5
  const jitterX = size * 0.18
  const jitterY = size * 0.14
  // ponytail: worst-case jitter must still overlap; raise overlap (lower gap) if this trips.
  if (colGap + jitterX >= size || rowGap + jitterY >= size) {
    throw new Error('flower wall would leave gaps')
  }
  const cols = Math.ceil(w / colGap) + 2
  const rows = Math.ceil(h / rowGap) + 2
  const cells: FlowerCell[] = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = c * colGap - size * 0.4 + (Math.random() - 0.5) * jitterX
      const y = r * rowGap - size * 0.4 + (Math.random() - 0.5) * jitterY
      let kind = (c % 2) as 0 | 1
      if (Math.random() < 0.22) kind = (1 - kind) as 0 | 1
      const cy = y + size * 0.5
      cells.push({
        x,
        y,
        rot: (Math.random() - 0.5) * 28,
        sc: 0.94 + Math.random() * 0.16,
        kind,
        delay: 1 - Math.min(1, Math.max(0, cy / h)),
        z: rows - r,
      })
    }
  }
  return cells
}

function FlowerCurtain({
  phase, cells, size, top, height,
}: {
  phase: 'grow' | 'fade'
  cells: FlowerCell[]
  size: number
  top: number
  height: number
}) {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 z-[90] flex justify-center overflow-hidden"
      style={{ top, height, pointerEvents: 'auto' }}
    >
      <div className="relative h-full w-full max-w-[480px] overflow-hidden">
        {cells.map((cell, i) => (
          <img
            key={i}
            src={FLOWER_SRC[cell.kind]}
            alt=""
            width={size}
            height={size}
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              left: cell.x,
              top: cell.y,
              width: size,
              height: size,
              zIndex: cell.z,
              ['--rot' as string]: `${cell.rot}deg`,
              ['--sc' as string]: String(cell.sc),
              transformOrigin: '50% 50%',
              transform: `scale(${cell.sc}) rotate(${cell.rot}deg)`,
              animation: phase === 'grow'
                ? `flower-grow ${FLOWER_GROW_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${cell.delay * FLOWER_GROW_STAGGER}ms both`
                : `flower-fade ${FLOWER_FADE_MS}ms ease-out ${cell.delay * FLOWER_FADE_STAGGER}ms both`,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState<CategoryData | null>(null)
  const fontsReady = useFontsReady()
  const shell = useVisualShell()
  const [categories, setCategories] = useState<CategoryData[]>(
    () => readCatalogueCache() ?? [],
  )
  const [catalogueReady, setCatalogueReady] = useState(false)
  const [bootDone, setBootDone] = useState(() => Boolean(pathSlug()))
  // introPhase waits until shloka finishes (unless deep-link skips boot)
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() =>
    pathSlug() ? 'trace' : 'wait',
  )
  const homeScrollTop = useRef(0)
  const [restoreScrollTop, setRestoreScrollTop] = useState<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    const deep = Boolean(pathSlug())

    ;(async () => {
      const { categories: next } = await loadCatalogue()
      if (cancelled) return
      setCategories(next)
      setCatalogueReady(true)

      const slug = pathSlug()
      if (slug) {
        const match = next.find((c) => c.slug === slug)
        if (match) setSelected(match)
      }

      // Warm CDN thumbs only — do NOT prefetch /api/media for every category here
      // (that flooded serverless with N parallel Drive downloads on every home load).
      // Share file prefetch runs when a gallery opens (see GalleryScreen).
      for (const c of next) warmCategoryImages(c)
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
    // Fade starts — kick header animation while shloka is still covering home
    setIntroPhase('trace')
  }, [])

  const onShlokaGone = useCallback(() => {
    setBootDone(true)
  }, [])

  const [curtain, setCurtain] = useState<{
    phase: 'grow' | 'fade'
    cells: FlowerCell[]
    size: number
  } | null>(null)
  const playingRef = useRef(false)
  const phaseRef = useRef<'off' | 'grow' | 'fade'>('off')
  const pendingRef = useRef<{ cat: CategoryData | null; push: boolean } | null>(null)
  const curtainTimers = useRef<number[]>([])

  const applyNav = useCallback((cat: CategoryData | null, push: boolean) => {
    if (cat) setRestoreScrollTop(undefined)
    else setRestoreScrollTop(homeScrollTop.current)
    setSelected(cat)
    if (push) window.history.pushState({}, '', cat ? categoryPath(cat.slug) : '/')
  }, [])

  const playCurtain = useCallback((cat: CategoryData | null, push: boolean) => {
    if (playingRef.current) {
      if (!push) {
        pendingRef.current = { cat, push: false }
        if (phaseRef.current === 'fade') applyNav(cat, false)
      }
      return
    }
    playingRef.current = true
    pendingRef.current = { cat, push }
    const size = flowerSizeFor(shell.width)
    phaseRef.current = 'grow'
    setCurtain({ phase: 'grow', cells: packFlowerWall(shell.width, shell.height, size), size })
    const t1 = window.setTimeout(() => {
      const next = pendingRef.current
      pendingRef.current = null
      if (next) applyNav(next.cat, next.push)
      phaseRef.current = 'fade'
      setCurtain((c) => (c ? { ...c, phase: 'fade' } : null))
      const t2 = window.setTimeout(() => {
        playingRef.current = false
        phaseRef.current = 'off'
        setCurtain(null)
      }, FLOWER_FADE_TOTAL)
      curtainTimers.current.push(t2)
    }, FLOWER_GROW_TOTAL)
    curtainTimers.current.push(t1)
  }, [applyNav, shell.width, shell.height])

  useEffect(() => () => {
    for (const id of curtainTimers.current) window.clearTimeout(id)
  }, [])

  const navigate = useCallback((cat: CategoryData | null) => {
    playCurtain(cat, true)
  }, [playCurtain])

  useEffect(() => {
    const onPop = () => {
      const slug = pathSlug()
      if (!slug) {
        playCurtain(null, false)
        return
      }
      const match = categories.find((c) => c.slug === slug)
      playCurtain(match ?? null, false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [categories, playCurtain])

  const contentReady = fontsReady && catalogueReady
  // Review mode: ?loop=1 keeps shloka replaying (no home handoff).
  const [loopShloka] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('loop'),
  )
  const showShloka = loopShloka || (!pathSlug() && !bootDone)

  return (
    <div
      className="flex justify-center items-stretch bg-white"
      style={{
        minHeight: shell.height,
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        // Pin to visual viewport so bottom chrome cannot cover the gallery footer
        paddingTop: shell.top,
        boxSizing: 'border-box',
      }}
    >
      <div
        className="relative w-full max-w-[480px]"
        style={{ height: shell.height }}
      >
        {contentReady && !loopShloka && (
          <div className="absolute inset-0">
            {selected
              ? <GalleryScreen
                  category={selected}
                  onBack={() => navigate(null)}
                  shellWidth={shell.width}
                />
              : <HomeScreen
                  categories={categories}
                  onViewAll={(cat) => navigate(cat)}
                  introPhase={introPhase}
                  setIntroPhase={setIntroPhase}
                  restoreScrollTop={restoreScrollTop}
                  onScrollTopChange={(y) => { homeScrollTop.current = y }}
                />}
          </div>
        )}
        {showShloka && (
          <ShlokaIntro
            ready={fontsReady && catalogueReady}
            onDone={onShlokaDone}
            onGone={onShlokaGone}
            loop={loopShloka}
          />
        )}
        {curtain && (
          <FlowerCurtain
            phase={curtain.phase}
            cells={curtain.cells}
            size={curtain.size}
            top={shell.top}
            height={shell.height}
          />
        )}
      </div>
    </div>
  )
}
