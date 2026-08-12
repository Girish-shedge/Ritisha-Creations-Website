# Rittisha Creations Website

Mobile decoration showcase: browse categories → open a gallery → enquire on WhatsApp.

**Live:** https://rittishacreations.vercel.app  
**Repo:** https://github.com/Girish-shedge/Ritisha-Creations-Website

---

## Start here (first time in this repo / new chat)

Read in this order:

1. **This README** — run the app, map of folders, request flow, deploy alias  
2. **`Project.md`** — product behaviour (animations, CTAs, Drive rules, mobile gotchas)  
3. **`src/App.tsx`** — all screens/UI (file opens with a section map)  
4. **`src/ShlokaIntro.tsx`** — boot shloka animation only  
5. **`src/data/driveCatalogue.ts`** + **`api/catalogue.js`** — how categories/photos are loaded  

You do **not** need `src/imports/` or root `imports/` — those are raw Figma dumps, unused by the app.

Agent style: `.cursor/rules/ponytail.mdc` (smallest correct fix; reuse existing patterns).

---

## Stack

React 19 · Vite 8 · Tailwind CSS v4 · TypeScript · pnpm · Vercel

---

## Develop

```bash
pnpm install
cp .env.example .env.local   # set API key + Drive folder id
pnpm dev                     # http://localhost:5173 (or $PORT)
pnpm build                   # security check + production bundle
pnpm preview
```

### Env (local + Vercel Production/Preview)

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_DRIVE_API_KEY` | Drive API key (client listing via `/api/catalogue`) |
| `VITE_DRIVE_FOLDER_ID` | Root folder — one **subfolder per category** |
| `GOOGLE_API_REFERER` | Optional; server Referer for Drive (see `api/catalogue.js`) |

Photos are **not** committed. They load from Googleusercontent CDN (`lh3…/d/{id}=wN`). Placeholder cream shows until each image decodes; session cache skips the flash on revisit.

---

## How a page load works

```
Browser
  → App mounts
  → ShlokaIntro (home only; skipped on /{slug} deep links)
  → loadCatalogue() → GET /api/catalogue → Drive folders + Image N files
  → HomeScreen (cards) or GalleryScreen (photos)
  → WhatsApp link on gallery green footer (always present on detail)
```

**Routing:** History API paths. `/` = home, `/{slug}` = that category’s gallery. `vercel.json` SPA rewrite.

### Deploy (required every prod push)

Production hostname is **`rittishacreations.vercel.app`** (two t’s in *Rittisha*).

```bash
npx vercel deploy --prod --yes
npx vercel alias set <deployment-url> rittishacreations.vercel.app
```

Vercel often auto-aliases the old one-t domain (`ritishacreations.vercel.app`). Always re-alias the two-t host after deploy.

---

## Folder map

```
src/
  main.tsx              Entry — CSS + mount App
  App.tsx               Entire UI (home, gallery, chrome, cards)
  ShlokaIntro.tsx       Boot animation (borders → plaque → Om → shloka → exit)
  index.css             Tailwind + fonts
  data/
    categories.ts       Types + localStorage catalogue cache
    driveCatalogue.ts   Fetch/normalize Drive → CategoryData[]
  lib/share.ts          Web Share (brand og-image first) + Image 1 prefetch
  assets/               bg, placeholder, intro art, icons
api/
  catalogue.js          Vercel serverless — lists Drive (Referer-safe)
  media.js              Image proxy fallback for share / stubborn files
public/
  favicon.ico           Multi-size 16/32/48 (Windows + legacy)
  favicon.png           32×32 convenience
  apple-touch-icon.png  180×180 (iPhone home screen)
  site.webmanifest      PWA icons 192 + 512
  icons/                Sized PNG set (see Brand icons below)
  fonts/                Season Mix Bold + SemiBold
scripts/
  generate-icons.mjs    Resize brand source → public icon set (`pnpm icons`)
  assets/brand-icon-source.png  Master श्री artwork
Project.md              Behaviour / design contract (+ mobile do-not-regress)
AGENTS.md               Figma Make / Vite agent notes
.cursor/rules/ponytail.mdc   Prefer smallest correct change
```

### Brand icons (favicon / PWA / share)

Source: `scripts/assets/brand-icon-source.png`. Regenerate with `pnpm icons`.

| File | Size | Platforms |
|------|------|-----------|
| `favicon.ico` | 16 + 32 + 48 | Windows browsers, legacy desktop |
| `icons/favicon-16x16.png` | 16 | Mac / Chrome / Firefox tabs |
| `icons/favicon-32x32.png` | 32 | Mac / Chrome / Firefox tabs |
| `icons/favicon-48x48.png` | 48 | Desktop + Android browser |
| `icons/apple-touch-icon-152x152.png` | 152 | iPad home screen |
| `icons/apple-touch-icon-167x167.png` | 167 | iPad Pro home screen |
| `apple-touch-icon.png` / `icons/…180` | 180 | iPhone home screen / iOS share hint |
| `icons/icon-192.png` | 192 | Android PWA / Add to Home Screen |
| `icons/icon-512.png` | 512 | Android PWA + native share sheet |
| `icons/og-image.png` | 1200 | Open Graph / Twitter / link previews |

Wired in `index.html` + `public/site.webmanifest`.  
**Share / OG:** `og-image.png` is the default Open Graph + Twitter image and the **first** file in the native share sheet (`src/lib/share.ts`). Gallery deep links still set `og:title` / `og:url` to the category, but `og:image` stays the brand mark.

### Figma ↔ code names

Code-built frames on Page 3 of **Extension - V2** use the same names as React (`HomeScreen`, `GalleryScreen`, `ShlokaIntro`, `BlueHeader`, `GreenFooter`, `CategoryCard`, `HandcraftedBadge`, …). Prefer those over generic `Frame 1580…` / `Screen N` when editing parity.

### `App.tsx` sections (search for `──`)

| Section | What it is |
|---------|------------|
| Design tokens / SVG paths | Header, footer, card frame geometry |
| `useChromeIntro` | Shared stroke → fill → text for blue header & green footer |
| `BlueHeader` / `GreenFooter` | Sticky chrome (footer mirrors header shell: `WAVE_AR` + `h-full`) |
| `RotatingLines` | CTA / footer copy rotator |
| `DriveImg` / `Card*` | Images, frame-masked blur, card scroller |
| `HomeScreen` / `GalleryScreen` | The two screens |
| `App` (default export) | Catalogue load, shloka gate, navigation |

---

## Content rules (Drive)

- Each **subfolder name** → `galleryTitle` + URL slug  
- Card `lines`: keep the product name intact; trailing `[size]` is its **own** line (`Circular Floral Backdrop` / `[3ft]`) — see `titleLines` in `api/catalogue.js` + `driveCatalogue.ts`  
- Files named `Image 1`, `Image 2`, … → sort by number; **Image 1** = gallery cover (not the site share/OG art)  
- Site brand art (श्री): multi-size set under `public/icons/` + `favicon.ico` (regenerate with `pnpm icons`). Link previews and Web Share use **`icons/og-image.png` first**  
- Empty or non-image folders are skipped  
- On API failure → last good `localStorage` cache (`ritisha.driveCatalogue.v5`)

Details: `Project.md`.

---

## Scripts

| Command | Does |
|---------|------|
| `pnpm dev` | Vite dev server |
| `pnpm icons` | Resize brand source → favicon / PWA / Apple / OG set |
| `pnpm build` | `security:check` then Vite build |
| `pnpm security:check` | Block accidental secrets in tracked sources |
| `pnpm sync:images` | Optional legacy Drive→disk sync (not used by the live CDN path) |

---

## Brand / contact

- Site title: **Rittisha Creations**  
- WhatsApp: `+918766630191`  
- Gallery prefill: `Hey, I am interested in {galleryTitle}`
