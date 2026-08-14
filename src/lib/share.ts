import type { CategoryData } from '@/data/categories'
import { categoryUrl } from '@/data/categories'

/** WhatsApp uses *text* for bold. */
const SHARE_TEXT = 'Hey, check out this amazing piece by *Rittisha Creations*'

function extFor(mime: string) {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return 'jpg'
}

const fileCache = new Map<string, Promise<File | null>>()

async function fetchPhotoFile(id: string, name: string): Promise<File | null> {
  // Same URL as <img> fallback so CDN cache is shared; server logs Sec-Fetch-Dest
  const urls = [
    `/api/media?id=${encodeURIComponent(id)}`,
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${import.meta.env.VITE_GOOGLE_DRIVE_API_KEY}`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const blob = await res.blob()
      if (!blob.size) continue
      const mime = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg'
      const base = name.replace(/\.[^.]+$/, '') || name || 'Image'
      return new File([blob], `${base}.${extFor(mime)}`, { type: mime })
    } catch {
      // try next
    }
  }
  return null
}

export function prefetchShareFile(id: string, name: string) {
  if (!id || fileCache.has(id)) return
  fileCache.set(id, fetchPhotoFile(id, name))
}

function getShareFile(id: string, name: string) {
  prefetchShareFile(id, name)
  return fileCache.get(id)!
}

/** Prefetch every gallery photo for the share sheet (no brand / favicon). */
export function prefetchCategoryShare(category: CategoryData) {
  for (const p of category.photos) prefetchShareFile(p.id, p.name)
}

export async function shareCategory(category: CategoryData) {
  const link = categoryUrl(category.slug)
  // URL only in text — avoids WhatsApp duplicating via ShareData.url
  const text = `${SHARE_TEXT}\n${link}`

  const files: File[] = []
  for (const p of category.photos) {
    const f = await getShareFile(p.id, p.name)
    if (f) files.push(f)
  }

  try {
    for (let n = files.length; n >= 1; n--) {
      const payload = { title: category.galleryTitle, text, files: files.slice(0, n) }
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload)
        return
      }
    }
    if (navigator.share) {
      await navigator.share({ title: category.galleryTitle, text })
      return
    }
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
  } catch {
    // cancelled
  }
}
