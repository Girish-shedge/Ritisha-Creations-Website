# Rittisha Creations Website

Mobile decoration showcase: browse categories → open a gallery → enquire on WhatsApp.

**Live:** https://rittishacreations.vercel.app  
**Repo:** https://github.com/Girish-shedge/Ritisha-Creations-Website

---

## Start here (first time in this repo)

Read in this order:

1. **This README** — run the app, map of folders, request flow  
2. **`Project.md`** — product behaviour (animations, CTAs, Drive rules)  
3. **`src/App.tsx`** — all screens/UI (file opens with a section map)  
4. **`src/ShlokaIntro.tsx`** — boot shloka animation only  
5. **`src/data/driveCatalogue.ts`** + **`api/catalogue.js`** — how categories/photos are loaded  

You do **not** need `src/imports/` or root `imports/` — those are raw Figma dumps, unused by the app.

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
  → WhatsApp link on gallery footer
```

**Routing:** History API paths. `/` = home, `/{slug}` = that category’s gallery. `vercel.json` SPA rewrite.

**Deploy note:** Production hostname is **`rittishacreations.vercel.app`** (two t’s). After `vercel deploy --prod`, alias that host to the new deployment if Vercel pointed the old single-t domain.

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
  lib/share.ts          Web Share + Image 1 prefetch
  assets/               bg, placeholder, intro art, icons
api/
  catalogue.js          Vercel serverless — lists Drive (Referer-safe)
  media.js              Image proxy fallback for share / stubborn files
public/fonts/           Season Mix Bold + SemiBold
Project.md              Behaviour / design contract
AGENTS.md               Figma Make / Vite agent notes
```

### `App.tsx` sections (search for `──`)

| Section | What it is |
|---------|------------|
| Design tokens / SVG paths | Header, footer, card frame geometry |
| `useChromeIntro` | Shared stroke → fill → text for blue header & green footer |
| `BlueHeader` / `GreenFooter` | Sticky chrome |
| `DriveImg` / `Card*` | Images, progressive blur, card scroller |
| `HomeScreen` / `GalleryScreen` | The two screens |
| `App` (default export) | Catalogue load, shloka gate, navigation |

---

## Content rules (Drive)

- Each **subfolder name** → category title + URL slug  
- Files named `Image 1`, `Image 2`, … → sort by number; **Image 1** = cover / share / OG  
- Empty or non-image folders are skipped  
- On API failure → last good `localStorage` cache (`ritisha.driveCatalogue.v4`)

Details: `Project.md`.

---

## Scripts

| Command | Does |
|---------|------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `security:check` then Vite build |
| `pnpm security:check` | Block accidental secrets in tracked sources |
| `pnpm sync:images` | Optional legacy Drive→disk sync (not used by the live CDN path) |

---

## Brand / contact

- Site title: **Rittisha Creations**  
- WhatsApp: `+918766630191`  
- Gallery prefill: `Hey, I am interested in {galleryTitle}`
