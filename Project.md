# Ritisha Creations — Decoration Showcase

Mobile-first decoration showcase (max-width 480px). React 19 + Vite 8 + Tailwind CSS v4. Live: https://ritishacreations.vercel.app

---

## What it is

Two screens: **Home** (category cards) → **Gallery** (photos). Gallery footer CTA opens WhatsApp.

**WhatsApp:** `+918766630191`  
**Gallery message:** `Hey, I am interested in {galleryTitle}`

---

## Content source (Google Drive)

**Root folder:** [Ritisha Creations Drive](https://drive.google.com/drive/folders/1blEF1JY8k4fGg66R_O1ZcSyN6wFHz9W8) (`VITE_DRIVE_FOLDER_ID`)

| Drive | App |
|-------|-----|
| Subfolder name | Category title + slug (`/modak-pushp-backdrop`) |
| Files named `Image 1`, `Image 2`, … | Sorted by number; `Image 1` = share/OG cover |
| Empty / non-image folders | Skipped |

- Fetched on **every page load** via Google Drive API (`VITE_GOOGLE_DRIVE_API_KEY`).
- Home uses **w640** thumbs; gallery uses **w1200**; placeholder until first load, then session-cached (no flash on revisit).
- Parallel folder fetches; warm thumbs + fulls after catalogue load (same page session).
- On API failure: last cached catalogue (`localStorage` `ritisha.driveCatalogue.v2`).
- Share proxy: `/api/media?id=` (Vercel + Vite dev middleware).

Deep links: `https://ritishacreations.vercel.app/{slug}` opens that gallery. SPA rewrite in `vercel.json`.

---

## Screens

### Home
- Sticky blue wave header — "Ritisha Creations" (stroke → fill → text intro once per load)
- Category cards — **1:1** corner-cut frame + horizontal scroller (autoplay only after card in view **≥1s**; swipe left/right to override); dots morph **4→12×4 pill** together
- **"View all photos"** fixed full-width button opens gallery (card image is not a tap target)
- Simple vertical list (no scroll scale/opacity)
- End tagline: “handcrafted and made with love ❤️” (`FS_CHROME`, **40px** top + bottom)
- Site `bg.png` at **75%** opacity
- No green WhatsApp footer on Home

### Gallery
- Overlay Figma nav: slides in from top (ease-in-out); black gradient @25% + progressive blur 4→0; circular back/share; white truncated title
- Share: `Hey, check out this amazing piece by *Ritisha Creations*` + single category URL (no duplicate `url` field); Image 1 prefetched for faster sheet
- Edge-to-edge **1:1** photos, **16px** gap (flush under overlay nav + footer); session image cache skips placeholders on revisit
- Footer chrome intro (stroke → fill → text) each open; images warm in parallel
- Sticky green footer — "DM us for more information"
- Site `bg.png` at **75%** opacity

Navigation: History API paths + 280ms fade. Back → `/`.

---

## Intro

### Shloka boot (first home load)
Two Devanagari lines (Figma `309:764`), fill-only `#FC9C02`: glyphs fade in left→right, line 1 then line 2 (~2s each, denser glyphs get more time). After 4s, slow pulse 100%↔50% (~2.2s cycle) until fonts + Drive catalogue are ready; skip pulse if already ready. Fade out → mount home (so header stroke→fill→text runs from the start). Skipped on category deep links.

### Home header (once per page load after shloka)
Stroke centre → left/right; fill waits for `transitionend` on `stroke-dashoffset`; then text.  
`introPhase`: `wait` → `trace` → `cards` → `done`. Does not replay on Gallery → Home.

### Gallery footer (each category open)
Same stroke → fill → text chain on "DM us for more information".

---

## Design tokens

| Token | Value |
|-------|-------|
| `FONT_BOLD` | `'Season Mix-TRIAL:Bold', 'Poppins', sans-serif` |
| `FS_HEAD` | 36px |
| `FS_CHROME` | 16px |
| weights | 780 Bold, 670 SemiBold (font file present) |

---

## SVG / layout constants (in `App.tsx`)

`HEADER`, `HEADER_LEFT`, `HEADER_RIGHT` — blue header (bump down)  
`FOOTER`, `FOOTER_LEFT`, `FOOTER_RIGHT` — green footer (bump up)  
`CARD_OVERLAY`, `CARD_FRAME`  
`WAVE_AR = 393/87.3859`

Backdrop blur is clipped to the SVG shape via `foreignObject` + `clipPath` (`pad = 12`).

---

## Content shape

```ts
interface CategoryData {
  id: string            // Drive folder id
  lines: string[]       // overlay lines from folder name
  galleryTitle: string
  photos: string[]      // Drive thumbnail URLs
}
```

Site background: `src/assets/bg.png`.

---

## Fonts

`/public/fonts/Season_Mix-TRIAL-Bold.woff2` and `SemiBold.woff2` — `@font-face` in `src/index.css`.

---

## File structure

```
src/
  App.tsx                 — all UI
  ShlokaIntro.tsx         — boot shloka loader
  main.tsx
  index.css
  data/categories.ts      — types + localStorage cache
  data/driveCatalogue.ts  — Drive fetch on load
  lib/share.ts            — Web Share + media proxy
  assets/bg.png
  assets/placeholder.png
  assets/intro/line1.svg, line2.svg
public/fonts/
api/media.js
.env.example
Project.md
```

---

## Components (all in `App.tsx` unless noted)

| Component | Role |
|-----------|------|
| `App` | nav state, catalogue load, home introPhase, shloka gate |
| `ShlokaIntro` | boot fill-letter animation (`ShlokaIntro.tsx`) |
| `HomeScreen` / `GalleryScreen` | screens |
| `BlueHeader` / `GreenFooter` | chrome |
| `WaveBlur` | shape-clipped backdrop blur |
| `CategoryCard` / `CardImageScroller` / `CardDots` / `GalleryPhoto` / `ViewAllButton` / `DriveImg` | content |

---

## Behaviours

- Header/footer blur when `scrollTop > 8` (after chrome intro settled)
- "View all photos" fixed full width
- First gallery photo `eager` + `fetchPriority="high"`; rest `lazy`; session `imgReady` cache
- Home cards and gallery tiles forced **1:1** via `aspect-ratio: 1 / 1` + `object-cover`
- Home card scroller: clone-first seamless loop; 3500ms dwell, 700ms `ease-in-out`
