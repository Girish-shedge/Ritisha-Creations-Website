/**
 * Category catalogue — images come from Google Drive at build time.
 *
 * Source of truth: Drive folder (one subfolder per category).
 * Run:  npm run sync:images
 * Build: npm run build  (syncs automatically first)
 *
 * Generated files (do not edit by hand):
 *   - src/data/categories.generated.ts
 *   - public/gallery/<slug>/<driveFileId>.webp
 */

export interface CategoryData {
  /** Unique slug — used as React key and DOM ID. No spaces. */
  id: string

  /**
   * Card title split into display lines.
   * Each string becomes one <p> inside the card overlay.
   * Split long titles so they read well on mobile (≤ 18 chars per line).
   */
  lines: string[]

  /** Image shown as the category card thumbnail on the Home screen. */
  cardImage: string

  /** Heading shown at the top of the Gallery screen. */
  galleryTitle: string

  /**
   * Gallery photos in display order.
   * First photo loads eagerly (above the fold); the rest load lazily.
   */
  photos: string[]
}

export { CATEGORIES } from './categories.generated'
