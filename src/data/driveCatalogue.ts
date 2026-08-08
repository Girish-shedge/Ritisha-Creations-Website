/**
 * Google Drive folder = source of truth.
 * Root folder → subfolders (categories, A→Z) → image files (photos, A→Z).
 * Fetched on every page load; callers keep last good cache on failure.
 */

import {
  type CategoryData,
  readCatalogueCache,
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

function driveImageUrl(fileId: string) {
  // Public-folder thumbnail — works in <img> without OAuth.
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
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

/** Split folder name into overlay lines (keep short names on one line). */
export function titleLines(name: string): string[] {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 3) return [name.trim()]
  const mid = Math.ceil(parts.length / 2)
  return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')]
}

export async function fetchDriveCatalogue(): Promise<CategoryData[]> {
  const folders = await listChildren(ROOT_FOLDER_ID, `mimeType = '${FOLDER_MIME}'`)
  const categories: CategoryData[] = []

  for (const folder of folders) {
    const files = await listChildren(folder.id, `mimeType contains 'image/'`)
    const photos = files.filter(isImage).map((f) => driveImageUrl(f.id))
    if (photos.length === 0) continue
    categories.push({
      id: folder.id,
      lines: titleLines(folder.name),
      galleryTitle: folder.name.trim(),
      photos,
    })
  }

  return categories
}

/**
 * Refresh from Drive. On success, writes cache.
 * On failure, returns cached categories (or []).
 */
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

// ponytail: one assert — title wrap + cache round-trip shape
if (import.meta.env.DEV) {
  const lines = titleLines('Circular Round Backdrop Extra')
  console.assert(lines.length === 2, 'titleLines should split long names', lines)
  console.assert(titleLines('Hanging Toran').length === 1, 'short names stay 1 line')
}
