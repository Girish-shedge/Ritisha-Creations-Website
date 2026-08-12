# Agent notes (Figma Make + this product)

This repo is a **Figma Make** Vite app that ships the **Rittisha Creations** site.

**Product docs first:** `README.md` (onboarding + folder map + deploy alias) → `Project.md` (behaviour + mobile do-not-regress).  
**UI entry:** `src/App.tsx` (section map in the file header) → `src/ShlokaIntro.tsx`.

**Live:** https://rittishacreations.vercel.app (two t’s). After every prod deploy, alias that host — Vercel often points the old one-t domain instead.

**Do not regress (see `Project.md`):** gallery green footer always visible with intro + rotating DM/Customization copy; card blur clipped to corner cuts; shloka both borders + per-letter glow/shadow (host filter for iOS).

**Brand / share:** favicon + OG from `scripts/assets/brand-icon-source.png` (`pnpm icons`). Share sheet and `og:image` use brand `icons/og-image.png`, not Drive Image 1. Card titles: `titleLines` keeps product name + puts trailing `[size]` on its own line. Catalogue cache key `ritisha.driveCatalogue.v5`.

**Figma:** code-parity frames on Page 3 use React names (`HomeScreen`, `GalleryScreen`, `ShlokaIntro`, …) — see `Project.md` § Figma layer names.

---

# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/ShlokaIntro.tsx` - Boot shloka animation (home load)
- `src/data/categories.ts` / `src/data/driveCatalogue.ts` - Catalogue types + Drive fetch
- `api/catalogue.js` / `api/media.js` - Vercel serverless catalogue + media proxy
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

Ignore `src/imports/` and root `imports/` — unused Figma dumps.

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Prefer the smallest change that fixes the root cause (see `.cursor/rules/ponytail.mdc`).
