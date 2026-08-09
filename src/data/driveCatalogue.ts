/**
 * Google Drive folder = source of truth.
 * Fetched via `/api/catalogue` (server Referer) on every page load;
 * callers keep last good cache on failure.
 */

import {
  type CategoryData,
  readCatalogueCache,
  slugify,
  writeCatalogueCache,
} from '@/data/categories'

export function driveThumbUrl(fileId: string, width: number) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`
}

export function driveProxyUrl(fileId: string) {
  return `/api/media?id=${encodeURIComponent(fileId)}`
}

/** Case-sensitive "Image N" prefix from Drive renames. */
export function imageIndex(name: string): number {
  const m = /^Image (\d+)\b/.exec(name)
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

export function titleLines(name: string): string[] {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 3) return [name.trim()]
  const mid = Math.ceil(parts.length / 2)
  return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')]
}

export async function fetchDriveCatalogue(): Promise<CategoryData[]> {
  const res = await fetch('/api/catalogue')
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Catalogue ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as { categories?: CategoryData[] }
  return data.categories ?? []
}

export async function loadCatalogue(): Promise<{
  categories: CategoryData[]
  fromCache: boolean
}> {
  try {
    const categories = await fetchDriveCatalogue()
    if (categories.length > 0) writeCatalogueCache(categories)
    return { categories, fromCache: false }
  } catch (err) {
    console.warn('[driveCatalogue]', err)
    const cached = readCatalogueCache()
    return { categories: cached ?? [], fromCache: true }
  }
}

if (import.meta.env.DEV) {
  console.assert(imageIndex('Image 1') === 1, 'Image 1 index')
  console.assert(imageIndex('Image 10') === 10, 'Image 10 index')
  console.assert(imageIndex('Image 2') < imageIndex('Image 10'), 'natural order')
  console.assert(slugify('Modak Pushp Backdrop') === 'modak-pushp-backdrop', 'slug')
  const lines = titleLines('Circular Round Backdrop Extra')
  console.assert(lines.length === 2, 'titleLines should split long names', lines)
}
