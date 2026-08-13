# Rittisha Creations — behaviour contract

Mobile-first decoration showcase (max-width **480px**).  
Stack: React 19 + Vite 8 + Tailwind CSS v4.  
Live: https://rittishacreations.vercel.app (two **t**’s — see Deploy below)

This file is the **product/behaviour** source of truth. For “how to run / where is the code?”, see `README.md`.

---

## What it is

Two screens: **Home** (category cards) → **Gallery** (photos). Gallery footer CTA opens WhatsApp.

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
- Sticky blue wave header — “Rittisha Creations” + swastiks (stroke → fill → marks → text; once per load; survives gallery → home via `settleInstant`)
- Category cards — **1:1** corner-cut frame; horizontal scroller (autoplay after **≥0.5s** mostly in view); swipe changes photos; **tap photo frame** or **Open in gallery** button opens detail (always at Image 1)
- Loading photos: white **श्री** `placeholder.png` (same as gallery) — no peach/orange wash behind it
- Title overlay: soft progressive blur (~**0→2.5**) + dark scrim, **clipped with `CARD_FRAME_MASK`** so blur/scrim follow the corner cuts (do not leave blur as a plain rectangle)
- Card product name: **max 2 lines** total (includes trailing `[size]`) then `…` truncate
- **Open in gallery** ↔ **Prices starting from ₹499** (arms with the same ≥0.5s in-view rule)
- Promo carousel under blue header (Figma 14:141 / 14:139 / 14:143): Subtract frame **361×203.172** hardcoded; **full-bleed** (not clipped by card `px-16`); slides **80%** column width; **16px** gap; infinite forward every **~2.8s** with **900ms** ease-in-out; center **100%**; sides **90%** + **75%** opacity; caption blur **12→0** bottom→top; labels **Ready to Install** / **Quality Materials Used** / **Handcrafted with Love**; non-interactive; intro with cards
- End badge: Handcrafted / & made with love (no extra top/bottom pad); list top/bottom inset **120px**; clears sticky contact bar
- Site `bg.png` at **75%** opacity
- Sticky home contact bar (Figma `Bottom Bar` / 7:82): appears only after home card intro is **done**; Call `9272517248` (copy → “Number copied” toast → `tel:+91…`) + WhatsApp `8766630191` (`Hey, I am interested in the designs`); full-width pills with **24px** gap + **drop shadow** `0 4 16 rgba(0,0,0,0.15)`; content always **center-aligned** (icon left, number right); after **1s** of scrolling collapses to **48×48** icons (slow **1s** ease); after **1s** idle expands the same way; **home only** — gallery keeps wave `GreenFooter`
- No green wave WhatsApp footer on Home

### Gallery
- Nav chrome slides in from top; progressive blur 4→0 + black gradient @25%
- Circular back / share; truncated white title (`galleryTitle`)
- Share: brand `og-image.png` **first** in the Web Share file list, then Image 1 (+ any warm extras); copy + category URL. `og:image` meta stays the brand mark (not the cover photo)
- Edge-to-edge **1:1** photos, **16px** gap; **no** top/bottom list padding (footer overlays the last photo)
- Tap a photo → lightbox: centered image, black blurred backdrop; bounce ease-in-out on open/close; pinch zoom (max ~4×); double-tap toggles ~2.5×; at 1× swipe L/R slides next/prev, swipe down or tap dimmed sides to close
- **Green footer must always be present** on every catalog detail open — **explicit px height** (`max(72, colW/WAVE_AR)`); do not rely on `aspect-ratio` + `%` height (collapses on some iOS WebViews)
- App shell height tracks **`visualViewport`** (not bare `100vh`/`100svh`) so the footer is not trapped under browser chrome on phones where layout viewport ≠ visible viewport
- Footer chrome intro **each open**: stroke → fill → text (no swastik “marks” step); fill **stays on** once shown (`fillOn = showFill || locked || settled` — same idea as BlueHeader)
- After fill, footer keeps the **frosted green** look immediately (blur + 0.75) — do not wait for list scroll
- After intro + **0.5s**, rotates **DM us for more information** ↔ **Customization also available**
- Footer stacks **above** the photo scroller via **`position: fixed`** to the visible viewport bottom (centered `max-w-[480px]`); wave only + `env(safe-area-inset-bottom)` — no solid green pad under the CTA

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
| `shareCategory` | `lib/share.ts` | Web Share — brand OG first |

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
| `HandcraftedBadge` | end-of-list badge |
| `galleryNav` / `Photo list` / `navScrim` | gallery chrome + list |

When rebuilding or cloning screens, rename layers to these names — do not leave `Frame 1580…` / `Screen N` on the parity frames.
