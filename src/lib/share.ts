import type { CategoryData } from '@/data/categories'
import { categoryUrl } from '@/data/categories'

/** WhatsApp uses *text* for bold. */
const SHARE_TEXT = 'Hey, check out this amazing piece by *Rittisha Creations*'
const BRAND_SHARE_NAME = 'Rittisha-Creations.png'

function extFor(mime: string) {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return 'jpg'
}

const fileCache = new Map<string, Promise<File | null>>()
const settled = new Map<string, File | null>()
let brandShareFile: Promise<File | null> | null = null

async function fetchBrandShareFile(): Promise<File | null> {
  // Prefer high-res share/OG art; fall back to PWA 512 then apple-touch
  const urls = ['/icons/og-image.png', '/icons/icon-512.png', '/apple-touch-icon.png']
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const blob = await res.blob()
      if (!blob.size) continue
      return new File([blob], BRAND_SHARE_NAME, { type: blob.type || 'image/png' })
    } catch {
      // try next
    }
  }
  return null
}

function getBrandShareFile() {
  if (!brandShareFile) brandShareFile = fetchBrandShareFile()
  return brandShareFile
}

async function fetchPhotoFile(id: string, name: string): Promise<File | null> {
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
  const p = fetchPhotoFile(id, name).then((f) => {
    settled.set(id, f)
    return f
  })
  fileCache.set(id, p)
}

function getShareFile(id: string, name: string) {
  prefetchShareFile(id, name)
  return fileCache.get(id)!
}

/** Prefetch brand art + Image 1 for snappy share sheets. */
export function prefetchCategoryShare(category: CategoryData) {
  void getBrandShareFile()
  const cover = category.photos.find((p) => p.id === category.coverId) ?? category.photos[0]
  if (cover) prefetchShareFile(cover.id, cover.name || 'Image 1')
}

export async function shareCategory(category: CategoryData) {
  const link = categoryUrl(category.slug)
  // URL only in text — avoids WhatsApp duplicating via ShareData.url
  const text = `${SHARE_TEXT}\n${link}`

  const brand = await getBrandShareFile()
  const cover = category.photos.find((p) => p.id === category.coverId) ?? category.photos[0]
  const coverFile = cover ? await getShareFile(cover.id, cover.name || 'Image 1') : null

  const extras: File[] = []
  for (const p of category.photos) {
    if (!cover || p.id === cover.id) continue
    const f = settled.get(p.id)
    if (f) extras.push(f)
  }

  // Brand image first so the share sheet preview is always श्री / site art
  const files = [
    ...(brand ? [brand] : []),
    ...(coverFile ? [coverFile] : []),
    ...extras,
  ]

  try {
    if (files.length > 1) {
      const multi = { title: category.galleryTitle, text, files }
      if (navigator.canShare?.(multi)) {
        await navigator.share(multi)
        return
      }
    }
    if (files.length >= 1) {
      const one = { title: category.galleryTitle, text, files: [files[0]] }
      if (navigator.canShare?.(one)) {
        await navigator.share(one)
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

  for (const p of category.photos) prefetchShareFile(p.id, p.name)
}
