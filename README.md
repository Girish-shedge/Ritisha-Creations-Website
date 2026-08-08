# Rittisha Creations Website

Mobile decoration showcase. Browse categories, open galleries, enquire on WhatsApp.

**Live:** https://ritishacreations.vercel.app  
**Repo:** https://github.com/Girish-shedge/Ritisha-Creations-Website

## Stack

React 19 · Vite 8 · Tailwind CSS v4 · TypeScript

## Develop

```bash
pnpm install
cp .env.example .env.local   # set VITE_GOOGLE_DRIVE_API_KEY
pnpm dev
pnpm build
```

## Content

Google Drive is the source of truth (one subfolder per category, fetched on each page load).  
Copy `.env.example` → `.env.local` and set:

- `VITE_GOOGLE_DRIVE_API_KEY`
- `VITE_DRIVE_FOLDER_ID` (default folder id is already in `.env.example`)

On Vercel, set the same env vars for Production / Preview.

Photos load via Googleusercontent CDN (`lh3`); placeholder shows until each image is ready.  
Shloka boot plays `/audio/shankh.mp3` (~4.5s at 75% volume).

See `Project.md` for behaviour and design notes (shloka, home/gallery chrome, rotating CTAs, Drive catalogue, share).
