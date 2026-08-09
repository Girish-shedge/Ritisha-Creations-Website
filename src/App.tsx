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
 *   RotatingLines                 CTA / footer copy rotator
 *   DriveImg / Card*              Photos, frame-masked blur, scroller, category card
 *   HomeScreen / GalleryScreen    Screens
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

const SLIDE_MS = 3500
const SLIDE_EASE_MS = 700
const CARD_ARM_MS = 500
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
const T_FILL_DUR  = 550
const T_MARK_DUR  = 420   // swastiks fade in at center
const T_TEXT_DUR  = 550   // swastiks split + title reveal
const T_HEADER_INTRO = T_TRACE_DUR + T_FILL_DUR + T_MARK_DUR + T_TEXT_DUR
/** Slide home cards in when header chrome is ~60% through. */
const T_CARDS_AT = Math.round(T_HEADER_INTRO * 0.6)
const T_CARDS_GAP = 900   // after cards start, then enable scroll
const SCROLL_RESTORE_MS = 900

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** Animate scrollTop with ease-in-out (returns cancel). */
function animateScrollTop(el: HTMLElement, to: number, ms: number) {
  const from = el.scrollTop
  if (Math.abs(to - from) < 1) {
    el.scrollTop = to
    return () => {}
  }
  const t0 = performance.now()
  let raf = 0
  const tick = (now: number) => {
    const u = easeInOut(Math.min(1, (now - t0) / ms))
    el.scrollTop = from + (to - from) * u
    if (u < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

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

// ── Blue sticky header ────────────────────────────────────────
function BlueHeader({
  label, scrolled, playIntro, onIntroComplete, settleInstant = false,
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
    color: '#007AB1',
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
        {(settled || locked) && <WaveBlur clipId="blueH_wblur" path={HEADER} active={scrolled} />}
        <path
          d={HEADER}
          fill="url(#blueHGrad)"
          style={{
            fillOpacity: fillOn ? 1 : 0,
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
  label, href, playIntro = false, onIntroComplete, visible = true, rotateActive = true, shellWidth,
}: {
  label: string | string[]
  href: string
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
    color: '#4CED77',
    go: traceGo,
    visible: tracing,
    duration: T_TRACE_DUR,
  })

  // Once filled, keep the frosted green look — don't wait for the user to scroll
  const fillOn = showFill || locked || settled
  const frosted = fillOn

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="pointer-events-auto block w-full active:opacity-75" aria-label={aria}
      style={{
        visibility: visible ? 'visible' : 'hidden',
        // Lift wave above home indicator only — no solid green pad under the footer
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
          {frosted && <WaveBlur clipId={`${uid}_wblur`} path={FOOTER} active />}
          <path
            d={FOOTER}
            fill={`url(#${uid}_grad)`}
            style={{
              fillOpacity: fillOn ? (frosted ? 0.75 : 1) : 0,
              transition: `fill-opacity ${T_FILL_DUR}ms ease-in-out`,
            }}
          />
          <path d={FOOTER_LEFT} {...stroke} onTransitionEnd={onStrokeTransitionEnd} />
          <path d={FOOTER_RIGHT} {...stroke} />
          <defs>
            <linearGradient id={`${uid}_grad`} x1="196.5" y1="6.563" x2="196.5" y2="87.386" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6CEB3E" /><stop offset="1" stopColor="#4CED77" />
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
              color: '#0d2b08',
            }}
          />
        </span>
      </div>
    </a>
  )
}

/** Home end badge — Figma 326:261, hardcoded for crisp edges. */
function HandcraftedBadge() {
  return (
    <div
      className="relative w-full flex justify-center"
      style={{ paddingTop: 24, paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Handcrafted and made with love"
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
            <linearGradient id="hcBadgeGrad" x1="102.066" y1="0" x2="102.066" y2="90.7594" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FC9C02" />
              <stop offset="1" stopColor="#964E01" />
            </linearGradient>
            <filter id="hcBadgeInner" x="-4%" y="-8%" width="108%" height="116%" filterUnits="objectBoundingBox">
              <feOffset dy="-2" />
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix values="0 0 0 0 0.507692 0 0 0 0 0.307627 0 0 0 0 0 0 0 0 1 0" />
              <feBlend in2="SourceGraphic" mode="normal" />
            </filter>
          </defs>
          <path
            filter="url(#hcBadgeInner)"
            fill="url(#hcBadgeGrad)"
            d="M102.066 90.7594C110.211 75.6331 122.625 78.7644 171.226 84.3472C176.873 84.9958 181.824 80.5803 181.824 74.8964V68.1461C193.399 70.3657 204.132 61.4955 204.132 49.7098V41.0497C204.132 29.264 193.399 20.3938 181.824 22.6134V15.863C181.824 -10.3524 117.801 29.2214 102.066 0C86.403 29.0888 22.3079 -10.3074 22.3079 15.863V22.6134C10.7333 20.3935 0 29.264 0 41.0497V49.7098C0 61.4955 10.7333 70.3657 22.3079 68.1461V74.8964C22.3079 80.5803 27.2595 84.9958 32.9062 84.3472C81.562 78.7584 93.9471 75.6817 102.066 90.7594Z"
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
    const id = m?.[1] ? decodeURIComponent(m[1]) : null
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
        background: '#E8D4C8',
      }}
      aria-busy={!showPhoto}
    >
      {/* Always-visible cream base so empty/failed loads never look transparent */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(145deg, #F3E4DA 0%, #E0C4B4 45%, #D4B09E 100%)',
          opacity: showPhoto ? 0 : 1,
          transition: 'opacity 280ms ease-in-out',
        }}
      />
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

// ── View-all button (fixed full width) ────────────────────────
function ViewAllButton({
  onClick, children, ariaLabel,
}: {
  onClick: () => void
  children: React.ReactNode
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex w-full items-center justify-center overflow-hidden active:opacity-75"
      style={{
        paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
        borderRadius: 62,
        background: 'linear-gradient(to top, #000 12.393%, #333)',
      }}
    >
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
          />
        </div>
        {/* Blur sits outside the frame mask — ancestor masks kill backdrop-filter */}
        <CardBlurOverlay uid={category.id} />
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end z-10 pb-4 pointer-events-none"
          style={{ paddingLeft: 24, paddingRight: 24, gap: 12 }}>
          <CardDots count={category.photos.length} active={slide} />
          <div className="flex flex-col items-center w-full">
            {category.lines.map((line, i) => (
              <p key={i} className="text-white text-center leading-tight m-0 w-full"
                style={{
                  fontFamily: FONT_BOLD,
                  fontWeight: 780,
                  fontSize: FS_HEAD,
                  textShadow: '0 1px 3px rgba(0,0,0,0.45)',
                }}>{line}</p>
            ))}
          </div>
        </div>
      </div>
      <ViewAllButton
        onClick={onViewAll}
        ariaLabel="View all photos — Prices starting from ₹499"
      >
        <RotatingLines
          lines={['View all photos', 'Prices starting from ₹499']}
          active={armed}
          style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: FS_CHROME, color: '#fff', lineHeight: 1.4 }}
        />
      </ViewAllButton>
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
  const headerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const restoredRef = useRef(false)
  const [scrolled, setScrolled] = useState(false)
  const [headerH, setHeaderH] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) / WAVE_AR : 0)

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

  useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Smooth ease-in-out scroll restore when returning from gallery
  useEffect(() => {
    if (restoredRef.current) return
    if (restoreScrollTop == null || restoreScrollTop <= 0) return
    if (introPhase !== 'done') return
    const el = scrollerRef.current
    if (!el) return
    restoredRef.current = true
    el.scrollTop = 0
    setScrolled(false)
    const cancel = animateScrollTop(el, restoreScrollTop, SCROLL_RESTORE_MS)
    const end = window.setTimeout(() => {
      setScrolled(restoreScrollTop > 8)
    }, SCROLL_RESTORE_MS)
    return () => {
      cancel()
      clearTimeout(end)
    }
  }, [restoreScrollTop, introPhase])

  const cardsVisible = introPhase === 'cards' || introPhase === 'done'
  const scrollable = introPhase === 'done'

  return (
    <div className="relative size-full overflow-hidden">
      <BgImage />

      <div ref={headerRef} className="absolute top-0 left-0 right-0 z-30" style={{ aspectRatio: `${WAVE_AR}` }}>
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
          paddingTop: headerH + 16,
          overflowY: scrollable ? 'auto' : 'hidden',
        }}
        onScroll={(e) => {
          if (!scrollable) return
          const y = e.currentTarget.scrollTop
          setScrolled(y > 8)
          onScrollTopChange?.(y)
        }}
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
          <HandcraftedBadge />
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

  // Nav intro after paint; warm gallery images into session cache
  useEffect(() => {
    setFooterReady(false)
    setRotateReady(false)
    setNavIn(false)
    setShowPhotos(false)

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
    const brandImage = `${window.location.origin}/favicon.png`
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
            />
          ))}
        </div>
      </div>
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
        <div className="pointer-events-auto w-full max-w-[480px]">
          <GreenFooter
            key={category.id}
            label={['DM us for more information', 'Customization also available']}
            href={waUrl(waCategoryMsg(category.galleryTitle))}
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

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState<CategoryData | null>(null)
  const [visible,  setVisible]  = useState(true)
  const fontsReady = useFontsReady()
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

      // Warm all thumbs + fulls for this session (DriveImg skips placeholders once ready)
      for (const c of next) {
        prefetchCategoryShare(c)
        warmCategoryImages(c)
      }
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

  const navigate = useCallback((cat: CategoryData | null) => {
    setVisible(false)
    setTimeout(() => {
      if (cat) {
        // Leaving home → keep scroll for back-from-gallery restore
        setRestoreScrollTop(undefined)
      } else {
        setRestoreScrollTop(homeScrollTop.current)
      }
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

  const contentReady = fontsReady && catalogueReady
  // Review mode: ?loop=1 keeps shloka replaying (no home handoff).
  const [loopShloka] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('loop'),
  )
  const showShloka = loopShloka || (!pathSlug() && !bootDone)
  const shell = useVisualShell()

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
          <div className="absolute inset-0"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 280ms ease-in-out, transform 280ms ease-in-out',
            }}>
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
      </div>
    </div>
  )
}
