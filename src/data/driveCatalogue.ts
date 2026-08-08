/**
 * Google Drive folder = source of truth.
 * Root folder → subfolders (categories, A→Z) → Image N files (natural order).
 * Fetched on every page load; callers keep last good cache on failure.
 */

import {
  type CategoryData,
  type CategoryPhoto,
  readCatalogueCache,
  slugify,
  writeCatalogueCache,
} from '@/data/categories'

const ROOT_FOLDER_ID =
  import.meta.env.VITE_DRIVE_FOLDER_ID || '1blEF1JY8k4fGg66R_O1ZcSyN6wFHz9W8'
const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY as string | undefined

const FOLDER_MIME = 'application/vnd.google-apps.folder'

interface DriveFile {
  id: string
  name: string
  mimeType: string
}

export function driveThumbUrl(fileId: string, width: number) {
  // Same-origin proxy — Drive thumbnail hotlinks break in production (403 / empty).
  // width kept for API compatibility; proxy returns full file (browser caches).
  void width
  return `/api/media?id=${encodeURIComponent(fileId)}`
}

async function listChildren(parentId: string, extraQ: string): Promise<DriveFile[]> {
  if (!API_KEY) throw new Error('Missing VITE_GOOGLE_DRIVE_API_KEY')

  const q = `'${parentId}' in parents and trashed = false and (${extraQ})`
  const params = new URLSearchParams({
    q,
    orderBy: 'name',
    pageSize: '100',
    fields: 'files(id,name,mimeType)',
    key: API_KEY,
  })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive API ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as { files?: DriveFile[] }
  return data.files ?? []
}

function isImage(f: DriveFile) {
  return f.mimeType.startsWith('image/')
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

function toPhoto(f: DriveFile): CategoryPhoto {
  return {
    id: f.id,
    name: f.name,
    thumb: driveThumbUrl(f.id, 640),
    full: driveThumbUrl(f.id, 1200),
  }
}

export async function fetchDriveCatalogue(): Promise<CategoryData[]> {
  const folders = await listChildren(ROOT_FOLDER_ID, `mimeType = '${FOLDER_MIME}'`)

  const categories = await Promise.all(
    folders.map(async (folder) => {
      const files = (await listChildren(folder.id, `mimeType contains 'image/'`))
        .filter(isImage)
        .sort((a, b) => imageIndex(a.name) - imageIndex(b.name) || a.name.localeCompare(b.name))

      if (files.length === 0) return null

      const photos = files.map(toPhoto)
      const cover = files.find((f) => imageIndex(f.name) === 1) ?? files[0]
      const title = folder.name.trim()

      return {
        id: folder.id,
        slug: slugify(title),
        lines: titleLines(title),
        galleryTitle: title,
        photos,
        coverId: cover.id,
      } satisfies CategoryData
    }),
  )

  return categories.filter((c): c is CategoryData => c !== null)
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
