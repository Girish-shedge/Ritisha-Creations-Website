/**
 * Rittisha Creations — category shape + localStorage cache.
 * Live content comes from Google Drive (see driveCatalogue.ts).
 */

export interface CategoryPhoto {
  id: string
  name: string
  /** Smaller URL for home card scroller */
  thumb: string
  /** Larger URL for gallery */
  full: string
}

export interface CategoryData {
  id: string
  slug: string
  lines: string[]
  galleryTitle: string
  photos: CategoryPhoto[]
  /** Drive file id for "Image 1" (share / OG cover) */
  coverId: string
}

const CACHE_KEY = 'ritisha.driveCatalogue.v5'

export function readCatalogueCache(): CategoryData[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CategoryData[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    if (!parsed[0]?.slug || !parsed[0]?.photos?.[0]?.thumb) return null
    return parsed
  } catch {
    return null
  }
}

export function writeCatalogueCache(categories: CategoryData[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(categories))
  } catch {
    // ponytail: quota / private mode — skip cache write
  }
}

export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function categoryPath(slug: string) {
  return `/${slug}`
}

export function categoryUrl(slug: string) {
  if (typeof window === 'undefined') return `https://rittishacreations.vercel.app/${slug}`
  return `${window.location.origin}/${slug}`
}
