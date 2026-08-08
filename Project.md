# Ritisha Creations — Decoration Showcase App

Mobile-first decoration showcase app for Ritisha Creations. Built with React 19 + Vite 8 + Tailwind CSS v4 inside Figma Make.

---

## What It Is

A two-screen mobile app (max-width 480px) that showcases decoration categories with a photo gallery. Visitors can browse categories on the home screen and tap through to a full-screen photo gallery per category. All CTAs link to WhatsApp for enquiries.

**WhatsApp number:** `+918766630191`
**WhatsApp (home):** `Hey, I want to enquire about decoration items`  
**WhatsApp (gallery):** `Hey, I am interested in {galleryTitle}`

---

## Screens

### Screen 1 — Home
- **Sticky blue wave header** — "Ritisha Creations" branding. Animated intro (stroke trace + fill). Backdrop blur activates on scroll, clipped to SVG wave shape only.
- **Category cards** — Scrollable list. Each card has a square photo, title overlay with gradient blur, and a "View all photos" grow button.
- **Sticky green wave footer** — "Whatsapp Us" CTA linking to WhatsApp.

### Screen 2 — Gallery
- **Sticky ornate blue arch header** — SVG arch shape. Backdrop blur on scroll.
- **Content starts at arch opening** — `top: 110px` in Figma = 52.07% of ornate header height (`ORNATE_CONTENT_RATIO = 110/211.423`).
- **Gallery title + photo grid** — Vertical list of square photos.
- **"Go Back" pill** — Appears after scrolling 40px; centred above content.
- **Sticky green wave footer** — "DM us for more information" CTA.

---

## Navigation

Transitions between screens with a 280ms fade + slide (`opacity` + `translateY(10px)`). `App` manages `selected: CategoryData | null` — null = Home, non-null = Gallery.

---

## Intro Animation (Home, plays once per app load)

| Phase | Timing | What happens |
|-------|--------|-------------|
| `trace` | 0 → 1100ms | SVG stroke draws from left + right outer corners toward centre bump peak simultaneously |
| `fill` | 1100ms | Blue fill floods in, "Ritisha Creations" label fades up |
| `cards` | 1500ms | Category cards slide up from below (staggered 180ms per card) |
| `footer` | 2000ms | Green footer slides up from off-screen |
| `done` | 2500ms | Normal state — scroll, blur, all interactions enabled |

**Strict Mode fix:** `introPhase` lives in `App` (persists across navigations). `HomeScreen` uses a `cancelled` closure flag in `useEffect` so React's double-invocation in development doesn't break the timers. `BlueHeader.traceGo` initialises to `true` if intro already played (back-navigation case).

---

## Design Tokens

| Token | Value |
|-------|-------|
| `FONT_BOLD` | `'Season Mix-TRIAL:Bold', 'Poppins', sans-serif` |
| `FS_HEAD` | `36px` — screen titles and card titles |
| `FS_CHROME` | `16px` — header, footer, all buttons |
| `font-weight` | `780` (Bold), `670` (SemiBold) |

---

## SVG Paths

| Constant | Description |
|----------|-------------|
| `WAVE` | Full wave shape — header and footer |
| `WAVE_LEFT` | Left half-stroke for intro trace animation |
| `WAVE_RIGHT` | Right half-stroke for intro trace animation |
| `CARD_OVERLAY` | Gradient blur overlay on category card bottom |
| `ORNATE` | Ornate arch shape — Screen 2 header |
| `FLIP` | `scale(1,-1) translate(0,-87.3859)` — flips wave vertically via SVG transform (NOT CSS, to avoid breaking `backdrop-filter`) |

**Aspect ratios:**
- `WAVE_AR = 393 / 87.3859` — used for wave header/footer sizing
- `ORNATE_AR = 393 / 211.423` — ornate header sizing
- `ORNATE_CONTENT_RATIO = 110 / 211.423` — content starts inside arch opening

---

## Backdrop Blur — Critical Implementation Detail

Blur is clipped to the SVG wave/ornate shape exactly, NOT to the rectangular div.

**Pattern (exact Figma method):**
```tsx
// Inside an <svg> element:
<foreignObject x={-pad} y={-pad} width={w + pad*2} height={h + pad*2}
  style={{ opacity: active ? 1 : 0, transition: 'opacity 350ms ease-in-out' }}>
  <div xmlns="http://www.w3.org/1999/xhtml"
    style={{ backdropFilter: 'blur(6px)', clipPath: `url(#${clipId})`,
             height: '100%', width: '100%' }} />
</foreignObject>
<defs>
  <clipPath id={clipId} transform={`translate(${pad} ${pad})`}>
    <path d={path} transform={pathTransform} />
  </clipPath>
</defs>
```

- `pad = 12` — foreignObject extends 12px beyond SVG bounds to avoid clipping the blur edge
- `clipPath transform="translate(12 12)"` offsets the clip to match the pad
- Blur activates only when `scrolled = true` (user has scrolled > 8px)
- **Do NOT use CSS `transform: rotate(180deg)` on a parent div** — it creates an isolated compositing group that breaks `backdrop-filter`. Use the SVG `FLIP` transform on the path element instead.

---

## Skeleton Loading

Shows while `fontsReady = false` (waiting for `document.fonts.ready`). Three shimmer layers:
- Blue shimmer wave (top) — shape matches the real header
- Gray shimmer cards (middle) — one per category
- Green shimmer wave (bottom) — shape matches the real footer

Skeleton is `z-50` with `pointer-events-none`. Fades out (380ms ease-in-out) when fonts are ready.

---

## Image & Category Database

**File:** `src/data/categories.ts`

Single source of truth for all categories and photos. Exports `CATEGORIES: CategoryData[]`.

```ts
interface CategoryData {
  id: string          // unique slug, no spaces
  lines: string[]     // card title split into display lines (≤18 chars each)
  cardImage: string   // thumbnail on Home card
  galleryTitle: string
  photos: string[]    // gallery photos in display order
}
```

**To add a new image:** Import it in `categories.ts`, add to the relevant category's `photos` array.

**To add a new category:** Import thumbnail + photos, push a new object into `CATEGORIES`.

---

## Fonts

**Font family:** Season Mix-TRIAL (private/custom font)

Files located at `/public/fonts/`:
- `Season_Mix-TRIAL-Bold.woff2` — weight 780
- `Season_Mix-TRIAL-SemiBold.woff2` — weight 670

Wired via `@font-face` in `src/index.css`. Families declared as:
- `'Season Mix-TRIAL:Bold'`
- `'Season Mix-TRIAL:SemiBold'`

---

## File Structure

```
src/
  App.tsx              — All UI components and screens
  index.css            — Tailwind import, @font-face, shimmer keyframes
  main.tsx             — React entrypoint
  data/
    categories.ts      — Category + photo database (edit here to manage content)
  imports/
    Screen1/           — Figma-generated assets (read-only)
    Screen2-1/         — Figma-generated assets (read-only)
public/
  fonts/
    Season_Mix-TRIAL-Bold.woff2
    Season_Mix-TRIAL-SemiBold.woff2
```

---

## Component Map

| Component | Purpose |
|-----------|---------|
| `App` | Root — navigation state, introPhase state, font-ready gating, skeleton overlay |
| `HomeScreen` | Screen 1 — manages scroll, header/footer heights, intro timing |
| `GalleryScreen` | Screen 2 — manages scroll, Go Back visibility, content positioning |
| `BlueHeader` | Sticky wave header with intro stroke → fill animation |
| `GreenFooter` | Sticky wave footer — WhatsApp link |
| `OrnateHeader` | Screen 2 arch header |
| `WaveBlur` | SVG foreignObject backdrop blur, clipped to any path shape |
| `CategoryCard` | Home screen category card with image, overlay, grow button |
| `CardBlurOverlay` | Gradient + blur on card bottom third |
| `ViewportButton` | Grows 90% → 100% width when it enters the viewport (IntersectionObserver) |
| `PhotoTile` | Square photo tile for gallery grid |
| `HomeSkeletonScreen` | Shimmer skeleton shown while fonts load |
| `SkeletonWave` | Blue or green shimmer wave for skeleton |
| `BgImage` | Full-bleed background photo (opacity 0.85) |
| `useFontsReady` | Hook — resolves `true` after `document.fonts.ready` |

---

## Key Behaviours

- **Scroll blur** — header and footer blur their wave shape (not the rectangle) when `scrollTop > 8`.
- **Viewport grow button** — "View all photos" expands from 90% to 100% width when it enters the viewport.
- **Go Back pill** — appears after 40px scroll on Gallery screen; centred with a single inline `transform: translateX(-50%) translateY(...)` (no mixing Tailwind + inline transform).
- **Image loading** — first photo per category loads `eager` + `fetchPriority="high"`; rest load `lazy`.
- **No parallax** — removed by user request.
- **Navigation transition** — 280ms fade + 10px slide on screen switch.
