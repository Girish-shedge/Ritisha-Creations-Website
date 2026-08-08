/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RITISHA CREATIONS — Image & Category Database
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW TO ADD A NEW IMAGE
 * ──────────────────────
 * 1. Drop your image file into  src/imports/Screen1/   (or any subfolder)
 * 2. Add an import line at the top of this file:
 *      import myPhoto from '@/imports/Screen1/my-photo.jpg'
 * 3. Append it to the `photos` array of the relevant category below.
 *
 * HOW TO ADD A NEW CATEGORY
 * ─────────────────────────
 * 1. Import its thumbnail and photos (see above).
 * 2. Push a new object into the CATEGORIES array following the same shape.
 *
 * HOW TO REORDER PHOTOS / CATEGORIES
 * ────────────────────────────────────
 * Just move items within the arrays — the UI reflects the order exactly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Image imports ─────────────────────────────────────────────────────────────
// Add new imports here ↓

import modakImg from '@/imports/Screen1/b6197db0286b3fb64e87acc7002782fc157ea3a8.png'
import toranImg from '@/imports/Screen1/25516bfbfc304c198f00d6864db46fba9ed6c4dd.png'

// ── Type ──────────────────────────────────────────────────────────────────────

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
   * Add as many as needed — the grid expands automatically.
   */
  photos: string[]
}

// ── Category list ─────────────────────────────────────────────────────────────
// ↓ Edit here to manage the catalogue

export const CATEGORIES: CategoryData[] = [
  // ── Modak Pushp Backdrop ──────────────────────────────────────────────────
  {
    id: 'modak',
    lines: ['Modak Pushp Backdrop'],
    cardImage: modakImg,
    galleryTitle: 'Modak Pushp Backdrop',
    photos: [
      modakImg, // photo 1  ← replace with real images
      modakImg, // photo 2
      modakImg, // photo 3
      modakImg, // photo 4
    ],
  },

  // ── Toran Backdrop Decor ──────────────────────────────────────────────────
  {
    id: 'toran',
    lines: ['Toran', 'Backdrop Decor'],
    cardImage: toranImg,
    galleryTitle: 'Toran Backdrop Decor',
    photos: [
      toranImg, // photo 1
      toranImg, // photo 2
      toranImg, // photo 3
      toranImg, // photo 4
    ],
  },

  // ── ADD NEW CATEGORY BELOW ────────────────────────────────────────────────
  // {
  //   id: 'my-category',
  //   lines: ['My Category', 'Name Here'],
  //   cardImage: myThumbImg,
  //   galleryTitle: 'My Category Name Here',
  //   photos: [myPhoto1, myPhoto2, myPhoto3],
  // },
]
