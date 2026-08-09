# Rittisha Creations — behaviour contract

Mobile-first decoration showcase (max-width **480px**).  
Stack: React 19 + Vite 8 + Tailwind CSS v4.  
Live: https://rittishacreations.vercel.app

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
| Subfolder name | Category title + slug (`/modak-pushp-backdrop`) |
| Files `Image 1`, `Image 2`, … | Sorted by number; `Image 1` = share / OG cover |
| Empty / non-image folders | Skipped |

- Listed on **every page load** via `GET /api/catalogue` (server sets Referer for Drive).
- Home thumbs **w640**; gallery **w1200**; cream placeholder until decode; session `imgReady` cache.
- On API failure: `localStorage` key `ritisha.driveCatalogue.v4`.
- Image fallback proxy: `/api/media?id=`.

Deep links: `https://rittishacreations.vercel.app/{slug}`. SPA rewrite in `vercel.json`.

---

## Screens

### Home
- Sticky blue wave header — “Rittisha Creations” + swastiks (stroke → fill → marks → text; once per load; survives gallery → home)
- Category cards — **1:1** corner-cut frame; horizontal scroller (autoplay after **≥1s** mostly in view); swipe overrides; dots **4→12×4**
- Title overlay: progressive blur **0→4** (top→bottom) + dark scrim
- **View all photos** ↔ **Prices starting from ₹499** (arms with the same ≥1s in-view rule)
- End badge: Handcrafted / & made with love (padding top 24 / bottom **40**)
- Site `bg.png` at **75%** opacity
- No green WhatsApp footer on Home

### Gallery
- Nav chrome slides in from top; progressive blur 4→0 + black gradient @25%
- Circular back / share; truncated white title
- Share copy + category URL; Image 1 prefetched
- Edge-to-edge **1:1** photos, **16px** gap; `paddingBottom` = footer height
- Footer chrome intro **each open**: stroke → fill → text (no swastik “marks” step)
- After intro + **1s**, rotates **DM us for more information** ↔ **Customization also available**

Navigation: History API + **280ms** fade. Back → `/`.

---

## Intro

### Shloka (`ShlokaIntro.tsx`) — first home load only
Phases: **borders → plaque → Om → dividers → letter reveal (glow+shadow) → hold → exit**.  
Viewport-pinned ornaments; plaque stage scales to fit. Skipped on `/{slug}` deep links.  
`?loop=1` replays forever (review). `onDone` starts home header; `onGone` unmounts overlay.

### Home header — after shloka
`introPhase`: `wait` → `trace` → `cards` → `done`. Does not replay when returning from gallery (`settleInstant`).

### Gallery footer — each category open
Stroke → fill → text via `useChromeIntro({ skipMarks: true })`.

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
  lines: string[]      // card title lines
  galleryTitle: string
  photos: CategoryPhoto[]
  coverId: string      // Image 1 file id
}
```

---

## Components

| Piece | File | Role |
|-------|------|------|
| `App` | `App.tsx` | Catalogue, shloka gate, route state |
| `ShlokaIntro` | `ShlokaIntro.tsx` | Boot animation |
| `HomeScreen` / `GalleryScreen` | `App.tsx` | Screens |
| `BlueHeader` / `GreenFooter` | `App.tsx` | Chrome + `useChromeIntro` |
| `DriveImg` / cards / blur | `App.tsx` | Media + home cards |

Unused: `src/imports/**`, root `imports/**` (Figma exports — do not wire into the app).
