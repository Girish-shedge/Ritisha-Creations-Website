/**
 * Ritisha Creations — category shape + localStorage cache.
 * Live content comes from Google Drive (see driveCatalogue.ts).
 */

export interface CategoryData {
  id: string
  lines: string[]
  galleryTitle: string
  photos: string[]
}

const CACHE_KEY = 'ritisha.driveCatalogue.v1'

export function readCatalogueCache(): CategoryData[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CategoryData[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
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
