# Ritisha Creations Website

Mobile decoration showcase. Browse categories, open galleries, enquire on WhatsApp.

**Live:** https://ritishacreations.vercel.app  
**Repo:** https://github.com/Girish-shedge/Ritisha-Creations-Website

## Stack

React 19 · Vite 8 · Tailwind CSS v4 · TypeScript · Sharp (build-time image compress)

## Develop

```bash
pnpm install
pnpm sync:images   # needs .env.local — see .env.example
pnpm dev
pnpm build         # syncs Drive images, then vite build
```

## Content

Google Drive is the source of truth (one subfolder per category).  
`pnpm build` / `pnpm sync:images` downloads, compresses to WebP, and writes `public/gallery/` + `src/data/categories.generated.ts`.

**Env (local `.env.local` + Vercel):**

- `GOOGLE_API_KEY`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_API_REFERER` (if the key uses HTTP referrer restrictions)

Never commit API keys. Prefer restricting the key to **Drive API only**.

See `Project.md` for UI behaviour and design notes.
