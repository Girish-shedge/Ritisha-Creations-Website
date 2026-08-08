# Ritisha Creations

React + Vite + Tailwind CSS v4. Hosted on Vercel.

## Structure

- `src/App.tsx` — UI (home + gallery)
- `src/data/driveCatalogue.ts` — Google Drive fetch (source of truth)
- `src/data/categories.ts` — types + localStorage cache
- `src/assets/` — site chrome images (`bg.png`)
- `src/index.css` — Tailwind + Season Mix Trial font faces
- `public/fonts/` — Season Mix Trial woff2 files
- `Project.md` — product/behaviour source of truth
- `.env.example` — `VITE_GOOGLE_DRIVE_API_KEY`, `VITE_DRIVE_FOLDER_ID`

## Commands

```bash
pnpm install
pnpm dev
pnpm build
```

## Rules

- Content lives in the shared Drive folder; do not hardcode category photos in the repo.
- Season Mix Trial only for brand type.
- Export React components as default exports where they are pages/roots.
- Ponytail (`.cursor/rules/ponytail.mdc`): delete over add; fewest files that work.
