import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import { CATEGORIES, type CategoryData } from '@/data/categories'
import bgImg from '@/imports/Screen1/68143c346ca972cc10d7f55aff2dd8ffb41326d2.png'

// ── Design tokens ─────────────────────────────────────────────
const FONT_BOLD = "'Season Mix-TRIAL:Bold', 'Poppins', sans-serif"
const FS_HEAD   = 36
const FS_CHROME = 16

// ── SVG paths ─────────────────────────────────────────────────
const WAVE =
  'M393 79.0298V87.3859H0V79.0944V79.0298C0 56.3397 20.6641 39.2621 42.9478 43.5358V30.5399C42.9478 -19.844 166.345 56.0023 196.5 0C226.793 56.2577 350.052 -19.9307 350.052 30.5399V43.5358C372.336 39.2626 393 56.3397 393 79.0298Z'
const CARD_OVERLAY =
  'M361 97.5C348.574 97.5 338.5 107.574 338.5 120H22.5C22.5 107.574 12.4264 97.5 0 97.5V0H361V97.5Z'
const ORNATE =
  'M178.198 0.000976373H392.994C392.994 108.154 392.995 132.996 392.995 211.423C337.495 162.869 395.657 95.1307 336.745 79.9103C331.365 78.5204 327.122 74.3611 325.799 68.9661C317.068 33.3782 281.797 38.0609 258.924 38.061C229.508 38.061 216.386 20.5907 195.856 0.418864C175.377 20.5412 162.299 38.0609 132.79 38.061C109.931 38.061 74.6508 33.3536 65.914 68.9661C64.5904 74.3618 60.3474 78.5204 54.9677 79.9103C-3.68512 95.0641 55.3718 162.998 0.0341797 211.409H0L0.000219822 0.000916127C45.0645 0.00135653 49.9426 0 86.454 0C133.588 6.42285e-09 130.975 0.000976373 178.198 0.000976373Z'

// SVG transform that flips the wave vertically (bump hangs down, flat at top).
// Used on path elements — does NOT create a CSS compositing group, so
// backdrop-filter inside the same SVG works correctly.
const FLIP = 'scale(1,-1) translate(0,-87.3859)'

// Half-wave stroke paths for the intro drawing animation.
// Both are in original (un-flipped) SVG coords; FLIP is applied via <g transform>.
// LEFT:  starts at top-left corner  → curves down → meets centre bump peak
// RIGHT: starts at top-right corner → curves down → meets centre bump peak
const WAVE_LEFT  = 'M0 87.3859 V79.0298 C0 56.3397 20.6641 39.2621 42.9478 43.5358 V30.5399 C42.9478 -19.844 166.345 56.0023 196.5 0'
const WAVE_RIGHT = 'M393 87.3859 V79.0298 C393 56.3397 372.336 39.2626 350.052 43.5358 V30.5399 C350.052 -19.9307 226.793 56.2577 196.5 0'

const WAVE_AR   = 393 / 87.3859
const ORNATE_AR = 393 / 211.423
const ORNATE_CONTENT_RATIO = 110 / 211.423

const WA_NUMBER = '918766630191'
const WA_HOME_MSG = 'Hey, I want to enquire about decoration items'
function waUrl(message: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`
}
function waCategoryMsg(name: string) {
  return `Hey, I am interested in ${name}`
}

// ── Intro animation ───────────────────────────────────────────
// introPhase lives in App so it persists across screen navigations.
// The effect inside HomeScreen uses a `cancelled` closure flag — this is the
// correct pattern for React Strict Mode, which double-invokes effects in dev:
// the first run's timers are cancelled on cleanup; the second run starts them
// fresh, so the animation plays exactly once per app load.

type IntroPhase = 'trace' | 'fill' | 'cards' | 'footer' | 'done'

// Timeline (ms from HomeScreen mount):
const T_TRACE  = 1100  // stroke drawing duration
const T_FILL   = 1100  // → fill + text appear
const T_CARDS  = 1500  // → cards slide up
const T_FOOTER = 2000  // → footer slides up
const T_DONE   = 2500  // → normal state (blur/scroll fully enabled)

// ── Font-ready hook ───────────────────────────────────────────
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { document.fonts.ready.then(() => setReady(true)) }, [])
  return ready
}

// ── Skeleton ──────────────────────────────────────────────────
function SkeletonWave({ variant }: { variant: 'blue' | 'green' }) {
  const cls = variant === 'blue' ? 'shimmer-blue' : 'shimmer-green'
  const id  = `sk_${variant}`
  return (
    <div className={`relative w-full flex-shrink-0 overflow-hidden ${cls}`} style={{ aspectRatio: `${WAVE_AR}` }}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 393 87.3859" preserveAspectRatio="none">
        <defs>
          <mask id={id}>
            <rect width="393" height="87.3859" fill="white" />
            <path d={WAVE} fill="black" />
          </mask>
        </defs>
        <rect width="393" height="87.3859" fill="white" mask={`url(#${id})`} />
      </svg>
    </div>
  )
}
function SkeletonCard() {
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="shimmer w-full" style={{ aspectRatio: '1/1', borderRadius: 4 }} />
      <div className="shimmer w-full" style={{ height: 48, borderRadius: 62 }} />
    </div>
  )
}
function HomeSkeletonScreen() {
  return (
    <div className="absolute inset-0 flex flex-col bg-white z-50">
      <SkeletonWave variant="blue" />
      <div className="flex-1 flex flex-col gap-10 px-4 py-4 overflow-hidden">
        <SkeletonCard /><SkeletonCard />
      </div>
      <SkeletonWave variant="green" />
    </div>
  )
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

// ── Blue sticky header ────────────────────────────────────────
interface BlueHeaderProps {
  label: string; scrolled: boolean; introPhase: IntroPhase
}
function BlueHeader({ label, scrolled, introPhase }: BlueHeaderProps) {
  const inIntro = introPhase !== 'done'
  const showFill = introPhase !== 'trace'

  // If intro already played (navigated back), start in drawn state.
  const [traceGo, setTraceGo] = useState(() => introPhase !== 'trace')
  useEffect(() => {
    if (introPhase !== 'trace') return
    const id = requestAnimationFrame(() => setTraceGo(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const strokeProps = {
    fill: 'none' as const,
    stroke: 'rgba(255,255,255,0.9)',
    strokeWidth: 1.8,
    pathLength: 1,
    strokeDasharray: 1,
    style: {
      strokeDashoffset: traceGo ? 0 : 1,
      transition: `stroke-dashoffset ${T_TRACE}ms cubic-bezier(0.4,0,0.2,1)`,
      opacity: showFill ? 0 : 1,
      // fade stroke out as fill comes in
      ...(showFill && { transition: `stroke-dashoffset ${T_TRACE}ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease-in-out` }),
    } as React.CSSProperties,
  }

  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 size-full"
        viewBox="0 0 393 87.3859" preserveAspectRatio="none" fill="none">

        {/* ── Blur (only after intro, only when scrolled) ── */}
        {!inIntro && (
          <WaveBlur clipId="blueH_wblur" path={WAVE} active={scrolled} pathTransform={FLIP} />
        )}

        {/* ── Solid fill — fades in after trace ── */}
        <path
          d={WAVE} transform={FLIP}
          fill="url(#blueHGrad)"
          style={{
            fillOpacity: showFill ? (inIntro ? 1 : (scrolled ? 0.75 : 1)) : 0,
            transition: 'fill-opacity 450ms ease-in-out',
          }}
        />

        {/* ── Intro stroke traces (left + right, simultaneous) ── */}
        {/* Rendered inside a <g> with the same FLIP so they follow the wave shape */}
        <g transform={FLIP}>
          <path d={WAVE_LEFT}  {...strokeProps} />
          <path d={WAVE_RIGHT} {...strokeProps} />
        </g>

        <defs>
          <linearGradient id="blueHGrad" x1="196.5" y1="6.563" x2="196.5" y2="87.386" gradientUnits="userSpaceOnUse">
            {/* Stops reversed so gradient reads correctly after vertical flip */}
            <stop stopColor="#00579A" /><stop offset="1" stopColor="#007AB1" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Label — fades in with fill ── */}
      <span
        className="absolute left-0 right-0 text-center text-white z-10 pointer-events-none"
        style={{
          top: '43.4%',
          transform: `translateY(-50%) translateY(${showFill ? 0 : 6}px)`,
          fontFamily: FONT_BOLD, fontWeight: 780,
          fontSize: FS_CHROME, lineHeight: 1.2,
          opacity: showFill ? 1 : 0,
          transition: 'opacity 400ms ease-out, transform 400ms ease-out',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Green sticky footer ───────────────────────────────────────
function GreenFooter({ label, scrolled, href }: { label: string; scrolled: boolean; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="pointer-events-auto block active:opacity-75" aria-label={label}>
      <div className="relative w-full" style={{ aspectRatio: `${WAVE_AR}` }}>
        <svg className="absolute inset-0 size-full"
          viewBox="0 0 393 87.3859" preserveAspectRatio="none" fill="none">
          <WaveBlur clipId="greenF_wblur" path={WAVE} active={scrolled} />
          <path d={WAVE} fill="url(#greenFGrad)"
            style={{ fillOpacity: scrolled ? 0.75 : 1, transition: 'fill-opacity 350ms ease-in-out' }} />
          <defs>
            <linearGradient id="greenFGrad" x1="196.5" y1="6.563" x2="196.5" y2="87.386" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6CEB3E" /><stop offset="1" stopColor="#4CED77" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute left-0 right-0 text-center z-10 pointer-events-none"
          style={{ bottom: '40%', transform: 'translateY(50%)',
                   fontFamily: FONT_BOLD, fontWeight: 780,
                   fontSize: FS_CHROME, lineHeight: 1.2, color: '#0d2b08' }}>
          {label}
        </span>
      </div>
    </a>
  )
}

// ── Ornate header — Screen 2 ──────────────────────────────────
function OrnateHeader({ scrolled }: { scrolled: boolean }) {
  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 size-full"
        viewBox="0 0 392.995 211.423" preserveAspectRatio="none" fill="none">
        <WaveBlur clipId="ornate_wblur" path={ORNATE} w={392.995} h={211.423} active={scrolled} />
        <path d={ORNATE} fill="url(#ornateGrad)"
          style={{ fillOpacity: scrolled ? 0.75 : 1, transition: 'fill-opacity 350ms ease-in-out' }} />
        <defs>
          <linearGradient id="ornateGrad" x1="196.498" y1="15.879" x2="196.498" y2="211.423" gradientUnits="userSpaceOnUse">
            <stop stopColor="#007AB1" /><stop offset="1" stopColor="#00579A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
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

// ── Category card ─────────────────────────────────────────────
interface CategoryCardProps {
  category: CategoryData; onViewAll: () => void
  introVisible: boolean; introDelay: number
}
function CategoryCard({ category, onViewAll, introVisible, introDelay }: CategoryCardProps) {
  return (
    <div className="flex flex-col gap-4 items-center w-full"
      style={{
        opacity: introVisible ? 1 : 0,
        transform: introVisible ? 'translateY(0)' : 'translateY(52px)',
        transition: `opacity 550ms ease-out ${introDelay}ms, transform 550ms cubic-bezier(0.22,1,0.36,1) ${introDelay}ms`,
      }}>
      <div className="relative w-full overflow-hidden cursor-pointer" style={{ aspectRatio: '1 / 1' }}
        onClick={onViewAll}>
        <img src={category.cardImage} alt={category.galleryTitle}
          loading="eager" fetchPriority="high" decoding="async"
          className="absolute inset-0 size-full object-cover block" style={{ maxWidth: 'none' }} />
        <CardBlurOverlay uid={category.id} />
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end z-10 px-4 pb-4">
          {category.lines.map((line, i) => (
            <p key={i} className="text-white text-center leading-tight m-0 w-full"
              style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: FS_HEAD }}>{line}</p>
          ))}
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
  onViewAll: (cat: CategoryData) => void
  introPhase: IntroPhase
  setIntroPhase: (p: IntroPhase) => void
}
function HomeScreen({ onViewAll, introPhase, setIntroPhase }: HomeScreenProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [headerH, setHeaderH] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) / WAVE_AR : 0)
  const [footerH, setFooterH] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) / WAVE_AR : 0)

  // ── Intro phase management ──────────────────────────────────
  // `cancelled` flag is the correct Strict Mode pattern: the first effect run
  // starts timers, Strict Mode cancels them on cleanup, the second run starts
  // them fresh. Only the second run's timers fire, advancing introPhase normally.
  // introPhase lives in App so it persists when navigating to Gallery and back.
  useEffect(() => {
    if (introPhase !== 'trace') return  // already played; skip on back-navigation
    let cancelled = false
    const set = (phase: IntroPhase, delay: number) =>
      setTimeout(() => { if (!cancelled) setIntroPhase(phase) }, delay)
    const timers = [
      set('fill',   T_FILL),
      set('cards',  T_CARDS),
      set('footer', T_FOOTER),
      set('done',   T_DONE),
    ]
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [])

  useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight)
      if (footerRef.current) setFooterH(footerRef.current.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const cardsVisible  = introPhase === 'cards' || introPhase === 'footer' || introPhase === 'done'
  const footerVisible = introPhase === 'footer' || introPhase === 'done'
  const scrollable    = introPhase === 'done'

  return (
    <div className="relative size-full overflow-hidden">
      <BgImage />

      {/* Sticky blue header */}
      <div ref={headerRef} className="absolute top-0 left-0 right-0 z-30" style={{ aspectRatio: `${WAVE_AR}` }}>
        <BlueHeader label="Ritisha Creations" scrolled={scrolled} introPhase={introPhase} />
      </div>

      {/* Footer — slides up from below on intro, then stays fixed */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        ref={footerRef}
        style={{
          transform: footerVisible ? 'translateY(0)' : 'translateY(105%)',
          transition: 'transform 480ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <GreenFooter label="Whatsapp Us" scrolled={scrolled} href={waUrl(WA_HOME_MSG)} />
      </div>

      {/* Scrollable content */}
      <div
        className="absolute inset-0 overflow-y-auto scroll-smooth"
        style={{
          paddingTop: headerH + 16,
          paddingBottom: footerH + 16,
          // Disable scroll during intro so animation plays cleanly
          overflowY: scrollable ? 'auto' : 'hidden',
        }}
        onScroll={(e) => scrollable && setScrolled(e.currentTarget.scrollTop > 8)}
      >
        <div className="flex flex-col gap-10 items-center px-4 pt-4 pb-4">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onViewAll={() => onViewAll(cat)}
              introVisible={cardsVisible}
              introDelay={i * 180}  // stagger 180ms per card
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Gallery photo tile ────────────────────────────────────────
function PhotoTile({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
      <img src={src} alt={alt}
        loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'}
        decoding="async" className="absolute inset-0 size-full object-cover block"
        style={{ maxWidth: 'none' }} />
    </div>
  )
}

// ── Screen 2 ─────────────────────────────────────────────────
function GalleryScreen({ category, onBack }: { category: CategoryData; onBack: () => void }) {
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [showBack, setShowBack] = useState(false)
  const [headerH, setHeaderH] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) / ORNATE_AR : 0)
  const [footerH, setFooterH] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 480) / WAVE_AR : 0)

  useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderH(headerRef.current.offsetHeight)
      if (footerRef.current) setFooterH(footerRef.current.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    setScrolled(top > 8)
    setShowBack(top > 40)
  }, [])

  const contentTop = headerH * ORNATE_CONTENT_RATIO

  return (
    <div className="relative size-full overflow-hidden">
      <BgImage />
      <div ref={headerRef} className="absolute top-0 left-0 right-0 z-30" style={{ aspectRatio: `${ORNATE_AR}` }}>
        <OrnateHeader scrolled={scrolled} />
      </div>
      <div ref={footerRef} className="absolute bottom-0 left-0 right-0 z-20">
        <GreenFooter
          label="DM us for more information"
          scrolled={scrolled}
          href={waUrl(waCategoryMsg(category.galleryTitle))}
        />
      </div>
      <div className="absolute inset-0 overflow-y-auto scroll-smooth"
        style={{ paddingTop: contentTop, paddingBottom: footerH + 16 }}
        onScroll={onScroll}>
        <div className="px-4 pt-4 pb-6 flex justify-center">
          <h1 className="text-[#232323] text-center leading-tight m-0"
            style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: FS_HEAD }}>
            {category.galleryTitle}
          </h1>
        </div>
        <div className="flex flex-col gap-10 items-center px-4 pb-4">
          {category.photos.map((src, i) => (
            <PhotoTile key={i} src={src} alt={`${category.galleryTitle} photo ${i + 1}`} priority={i === 0} />
          ))}
        </div>
      </div>
      {/* Go Back pill */}
      <div className="absolute z-40" style={{
        top: 16, left: '50%',
        transform: `translateX(-50%) translateY(${showBack ? 0 : -12}px)`,
        opacity: showBack ? 1 : 0, pointerEvents: showBack ? 'auto' : 'none',
        transition: 'opacity 400ms ease-in-out, transform 400ms ease-in-out',
        width: 'min(362px, calc(100% - 32px))',
      }}>
        <button onClick={onBack} className="w-full flex items-center justify-center active:opacity-75"
          style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                   borderRadius: 62, background: 'linear-gradient(to top, #000 12.393%, #333)' }}>
          <span style={{ fontFamily: FONT_BOLD, fontWeight: 780, fontSize: FS_CHROME, color: '#fff', lineHeight: 1.4 }}>
            Go Back
          </span>
        </button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState<CategoryData | null>(null)
  const [visible,  setVisible]  = useState(true)
  const fontsReady = useFontsReady()

  // introPhase lives here so navigating to Gallery and back doesn't replay it.
  const [introPhase, setIntroPhase] = useState<IntroPhase>('trace')

  const navigate = useCallback((cat: CategoryData | null) => {
    setVisible(false)
    setTimeout(() => { setSelected(cat); setVisible(true) }, 280)
  }, [])

  return (
    <div className="flex justify-center items-stretch min-h-[100dvh] bg-white">
      <div className="relative w-full max-w-[480px] h-[100dvh]">
        {/* Skeleton fades out when fonts are ready */}
        <div className="absolute inset-0 z-50 pointer-events-none"
          style={{ opacity: fontsReady ? 0 : 1, transition: 'opacity 380ms ease-in-out' }}>
          <HomeSkeletonScreen />
        </div>
        {/* Main content */}
        <div className="absolute inset-0"
          style={{
            opacity: fontsReady ? (visible ? 1 : 0) : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 280ms ease-in-out, transform 280ms ease-in-out',
          }}>
          {selected
            ? <GalleryScreen category={selected} onBack={() => navigate(null)} />
            : <HomeScreen
                onViewAll={(cat) => navigate(cat)}
                introPhase={introPhase}
                setIntroPhase={setIntroPhase}
              />}
        </div>
      </div>
    </div>
  )
}
