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
- Home uses **w640** thumbs; gallery uses **w1200**; shimmer placeholder until each image loads.
- Parallel folder fetches; warm `Image 1` thumbs after catalogue load.
- On API failure: last cached catalogue (`localStorage` `ritisha.driveCatalogue.v2`).
- Share proxy: `/api/media?id=` (Vercel + Vite dev middleware).

Deep links: `https://ritishacreations.vercel.app/{slug}` opens that gallery. SPA rewrite in `vercel.json`.

---

## Screens

### Home
- Sticky blue wave header — "Ritisha Creations" (stroke → fill → text intro once per load)
- Category cards — **1:1** corner-cut frame + infinite horizontal scroller; dots morph **4×4 → 12×4 pill** (ease-in-out, shrink/grow together)
- **"View all photos" only** opens gallery (card image is not a tap target)
- No green footer on Home
- **40px** bottom padding after the last card
- Scroll focus: centre card **scale 1 / opacity 1**; others → **0.9 / 0.75**

### Gallery
- Sticky Figma nav (`304:713`): 40px black circular back/share, truncated SemiBold title, blur + top gradient
- Share: Web Share with **all images when OS allows**, else **Image 1** + text `Hey, check out this amazing piece by Ritisha Creations` + category URL
- Edge-to-edge **1:1** photos, **0 gap**, shimmer while loading
- Sticky green footer — "DM us for more information" (intro each open)

Navigation: History API paths + 280ms fade. Back → `/`.

---

## Intro

### Home header (once per page load)
Stroke centre → left/right; fill waits for `transitionend` on `stroke-dashoffset`; then text.  
`introPhase`: `trace` → `cards` → `done`. Does not replay on Gallery → Home.

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
  main.tsx
  index.css
  data/categories.ts      — types + localStorage cache
  data/driveCatalogue.ts  — Drive fetch on load
  assets/bg.png
public/fonts/
.env.example
Project.md
```

---

## Components (all in `App.tsx`)

| Component | Role |
|-----------|------|
| `App` | nav state, catalogue load, home introPhase, skeleton until fonts + catalogue |
| `HomeScreen` / `GalleryScreen` | screens |
| `BlueHeader` / `GreenFooter` | chrome |
| `WaveBlur` | shape-clipped backdrop blur |
| `CategoryCard` / `CardImageScroller` / `CardDots` / `GalleryPhoto` / `ViewportButton` | content |
| `useScrollFocus` | home list scale/opacity by distance to viewport centre |
| `HomeSkeletonScreen` | font/catalogue shimmer |

---

## Behaviours

- Header/footer blur when `scrollTop > 8` (after chrome intro settled)
- "View all photos" grows 90% → 100% width in viewport
- First gallery photo `eager` + `fetchPriority="high"`; rest `lazy`
- Home cards and gallery tiles forced **1:1** via `aspect-ratio: 1 / 1` + `object-cover`
- Home card scroller: clone-first seamless loop; 3500ms dwell, 700ms `ease-in-out`
