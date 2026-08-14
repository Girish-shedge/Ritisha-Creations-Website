# Rittisha Creations — behaviour contract

Mobile-first decoration showcase (max-width **480px**).  
Stack: React 19 + Vite 8 + Tailwind CSS v4.  
Live: https://rittishacreations.vercel.app (two **t**’s — see Deploy below)

This file is the **product/behaviour** source of truth. For “how to run / where is the code?”, see `README.md`.

---

## What it is

Two screens: **Home** (category cards) → **Gallery** (photos). Gallery header WhatsApp opens a chat; the wave footer is decorative (rotating copy only).

**WhatsApp:** `+918766630191`  
**Gallery message:** `Hey, I am interested in {galleryTitle}`

---

## Content source (Google Drive)

**Root folder id:** `VITE_DRIVE_FOLDER_ID` (see `.env.example`)

| Drive | App |
|-------|-----|
| Subfolder name | `galleryTitle` + slug (e.g. `/circular-floral-backdrop-3ft`) |
| Trailing `[size]` in folder name | Own card line via `titleLines` — product name stays intact (`Circular Floral Backdrop` + `[3ft]`) |
| Files `Image 1`, `Image 2`, … | Sorted by number; `Image 1` = gallery cover / card thumb source |
| Empty / non-image folders | Skipped |

**Site brand icons (not Drive):** श्री master at `scripts/assets/brand-icon-source.png` → `pnpm icons` writes `public/favicon.ico`, `public/icons/*`, Apple touch, PWA 192/512, and `og-image.png` (1200) for tabs, home screens, and share / link previews. Regenerate whenever the master art changes.

- Listed on **every page load** via `GET /api/catalogue` (server sets Referer for Drive — use the **two-t** host).
- Home thumbs **w640**; gallery **w1200**; श्री watermark placeholder until decode; session `imgReady` cache.
- On API failure: `localStorage` key `ritisha.driveCatalogue.v5` (bump when catalogue shape / title-line rules change).
- Image fallback proxy: `/api/media?id=`.

Deep links: `https://rittishacreations.vercel.app/{slug}`. SPA rewrite in `vercel.json`.

---

## Screens

### Home
- Sticky orange/brown wave header — “Rittisha Creations” + swastiks (stroke → fill → marks → text; once per load; survives gallery → home via `settleInstant`); **no** frosted blur; **gradient stroke** (white → transparent on the hanging bump, Figma 34:1373)
- Category cards — **1:1** corner-cut frame; horizontal scroller (autoplay after **≥0.5s** mostly in view); swipe changes photos; **tap photo frame** opens detail (always at Image 1); **no** “Open in gallery” CTA under cards
- Loading photos: white **श्री** `placeholder.png` (same as gallery) — no peach/orange wash behind it
- Title overlay: soft progressive blur (~**0→2.5**) + dark scrim, **clipped with `CARD_FRAME_MASK`** so blur/scrim follow the corner cuts (do not leave blur as a plain rectangle)
- Card product name: **max 2 lines** total (includes trailing `[size]`) then `…` truncate
- **No** promo carousel
- End of list has **no** Handcrafted badge (it lives in the sticky footer)
- Site `bg.png` at **75%** opacity
- Sticky home footer (Figma 37:1377 plaque **204×91**): **Handcrafted / & made with love**; orange/brown fill + white→transparent gradient stroke; appears after home card intro is **done**; **no** Call / WhatsApp bar
- No green wave WhatsApp footer on Home

### Gallery
- Nav chrome slides in from top; progressive blur **12→0** + black gradient @25%
- Circular back / share / WhatsApp; truncated white title (`galleryTitle`) **left-aligned** between back and actions
- Share: **product photos only** (all gallery images; no favicon / brand `og-image`); copy + category URL. `og:image` meta stays the brand mark (not the cover photo)
- Edge-to-edge **1:1** photos, **16px** gap; **no** top/bottom list padding (footer overlays the last photo)
- Nav: back / share / WhatsApp at **48×48**; icons **1.5px** stroke; WhatsApp uses home green gradient + icon; **12px** gap before WhatsApp; opens same category WhatsApp message as before
- Tap a photo → lightbox: centered infinite carousel (clones at both ends), black blurred backdrop; bounce ease-in-out on open/close; pinch zoom (max ~4×) with edge-clamped pan; **double-tap toggles ~2.5× ↔ 1×** (works while zoomed too); at 1× swipe L/R changes photo **and wraps**: last + swipe left → first slides in from the right; first + swipe right → last slides in from the left; swipe down or tap dimmed sides to close
- **Orange/brown footer** (Figma 35:1374) always present — stroke → fill → text; **gradient stroke** (white → transparent on the rising bump); **no** frosted blur; solid fill; white rotating copy **Customization also available** ↔ **Prices starting from ₹499**; **not a WhatsApp link**; **explicit px height** (`max(72, colW/WAVE_AR)`)
- App shell height tracks **`visualViewport`** (not bare `100vh`/`100svh`) so the footer is not trapped under browser chrome on phones where layout viewport ≠ visible viewport
- Footer chrome intro **each open**: stroke → fill → text (no swastik “marks” step); fill **stays on** once shown (`fillOn = showFill || locked || settled` — same idea as BlueHeader)
- After intro + **0.5s**, rotates the two footer lines
- Footer stacks **above** the photo scroller via **`position: fixed`** to the visible viewport bottom (centered `max-w-[480px]`); wave only + `env(safe-area-inset-bottom)`

Navigation: History API + **280ms** fade. Back → `/`.

---

## Intro

### Shloka (`ShlokaIntro.tsx`) — first home load only
Phases: **borders → plaque → Om → dividers → letter reveal (glow+shadow) → hold → exit**.

- Shell height from `visualViewport`; ornaments use **px `translate3d`**, not `%` slides.
- Bottom border sits at `bottom: env(safe-area-inset-bottom)` (not under the home indicator).
- Bottom ornament = vertical mirror of top: wrapper `scaleY(-1)` + same `rotate(180deg)` on `<img>` as top (scaleY alone shows the thin baseline; scaleY on `<img>` can paint blank on iOS).
- Letters: **per-glyph only** glow while that letter is mid-appear (0→1→0), then fade; settled glyphs keep CSS `drop-shadow` (`LETTER_SHADOW`). Host filter is **shadow only** — never put glow on the line host (it lights the whole word/sentence).
- Plaque stage: 393×800 scaled with `min(vw, vh)`.
- Skipped on `/{slug}` deep links. `?loop=1` replays forever (review).
- `onDone` starts home header; `onGone` unmounts overlay.

### Home header — after shloka
`introPhase`: `wait` → `trace` → `cards` (at **60%** of header chrome) → `done`. Does not replay when returning from gallery (`settleInstant`). Back-from-gallery scroll restore is **instant** (no ease); keep the **280ms** home ↔ gallery fade.

### Gallery footer — each category open
Always mounted; `key={category.id}` remounts for a fresh intro. Stroke → fill → text via `useChromeIntro({ skipMarks: true })`. Explicit wave height (not aspect-ratio shell).

---

## Mobile / browser notes (do not regress)

- App shell uses `visualViewport` height/offset (see `useVisualShell` in `App.tsx`).
- `viewport-fit=cover` in `index.html`; safe-area inset under gallery wave footer only (no green rectangle pad).
- Test **iOS Chrome + Safari** and Android: green footer CTA text, shloka **both** borders, letter shadow/glow, card blur following cuts.
- After every `vercel deploy --prod`, alias **`rittishacreations.vercel.app`** (two t’s). Vercel often aliases the old one-t host (`ritishacreations.vercel.app`) instead.
- Drive Referer: shared `api/driveEnv.js`; `pnpm build` runs `scripts/drive-referer-check.mjs` (blocks two-t Referer drift + live probes the allowlisted host).

---

## Design tokens

| Token | Value |
|-------|-------|
| `FONT_BOLD` | `'Season Mix-TRIAL:Bold', 'Poppins', sans-serif` |
| `FONT_SEMI` | `'Season Mix-TRIAL:SemiBold', 'Poppins', sans-serif` |
| `FS_HEAD` | 36 |
| `FS_CHROME` | 16 |
| weights | 780 Bold, 670 SemiBold |

Fonts: `/public/fonts/Season_Mix-TRIAL-*.woff2` wired in `src/index.css`.

---

## Geometry (in `App.tsx`)

`HEADER` / `HEADER_LEFT` / `HEADER_RIGHT` — blue (bump down)  
`FOOTER` / `FOOTER_LEFT` / `FOOTER_RIGHT` — green (bump up)  
`CARD_OVERLAY`, `CARD_FRAME`, `CARD_FRAME_MASK`  
`WAVE_AR = 393 / 87.3859`

---

## Data shape

```ts
interface CategoryPhoto {
  id: string
  name: string
  thumb: string  // home card
  full: string   // gallery
}

interface CategoryData {
  id: string           // Drive folder id
  slug: string
  lines: string[]      // card title lines (size bracket alone when present)
  galleryTitle: string // full Drive folder name
  photos: CategoryPhoto[]
  coverId: string      // Image 1 file id
}
```

`titleLines` lives in both `api/catalogue.js` (server) and `src/data/driveCatalogue.ts` (dev asserts) — keep them in sync.

---

## Components

| Piece | File | Role |
|-------|------|------|
| `App` | `App.tsx` | Catalogue, shloka gate, route state |
| `ShlokaIntro` | `ShlokaIntro.tsx` | Boot animation |
| `HomeScreen` / `GalleryScreen` | `App.tsx` | Screens |
| `BlueHeader` / `GreenFooter` | `App.tsx` | Chrome + `useChromeIntro` |
| `DriveImg` / cards / blur | `App.tsx` | Media + home cards |
| `shareCategory` | `lib/share.ts` | Web Share — product photos only |

Unused: `src/imports/**`, root `imports/**` (Figma exports — do not wire into the app).

---

## Figma layer names (parity)

File **Extension - V2** (`PrF1j2l2jxbROee7Ek6PW8`), Page 3 — code-built frames should match React / `data-name`:

| Figma | Code |
|-------|------|
| `ShlokaIntro` | `ShlokaIntro.tsx` root |
| `HomeScreen` | `HomeScreen` |
| `GalleryScreen` | `GalleryScreen` |
| `BlueHeader` / `GreenFooter` | chrome components |
| `CategoryCard` / `cardMedia` / `cardCta` | home cards |
| `HomeFooterBadge` | sticky home Handcrafted plaque |
| `galleryNav` / `Photo list` / `navScrim` | gallery chrome + list |

When rebuilding or cloning screens, rename layers to these names — do not leave `Frame 1580…` / `Screen N` on the parity frames.
