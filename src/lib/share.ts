import type { CategoryData } from '@/data/categories'
import { categoryUrl } from '@/data/categories'

const SHARE_TEXT = 'Hey, check out this amazing piece by Ritisha Creations'

function extFor(mime: string) {
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  return 'jpg'
}

/** Fetch a Drive file as a shareable File (via same-origin proxy when possible). */
async function fetchPhotoFile(id: string, name: string): Promise<File | null> {
  const urls = [
    `/api/media?id=${encodeURIComponent(id)}`,
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${import.meta.env.VITE_GOOGLE_DRIVE_API_KEY}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const blob = await res.blob()
      if (!blob.size) continue
      const mime = blob.type || 'image/jpeg'
      const base = name.replace(/\.[^.]+$/, '') || name
      return new File([blob], `${base}.${extFor(mime)}`, { type: mime })
    } catch {
      // try next source
    }
  }
  return null
}

export async function shareCategory(category: CategoryData) {
  const url = categoryUrl(category.slug)
  const text = `${SHARE_TEXT}\n${url}`

  const cover = category.photos.find((p) => p.id === category.coverId) ?? category.photos[0]
  const others = category.photos.filter((p) => p.id !== cover?.id)

  const files: File[] = []
  if (cover) {
    const f = await fetchPhotoFile(cover.id, cover.name || 'Image 1')
    if (f) files.push(f)
  }
  // Try attaching the rest; OS may reject multi-file shares.
  for (const p of others) {
    const f = await fetchPhotoFile(p.id, p.name)
    if (f) files.push(f)
  }

  const payloadAll = { title: category.galleryTitle, text, url, files }
  const payloadOne = {
    title: category.galleryTitle,
    text,
    url,
    files: files.slice(0, 1),
  }
  const payloadLink = { title: category.galleryTitle, text, url }

  try {
    if (files.length > 1 && navigator.canShare?.(payloadAll)) {
      await navigator.share(payloadAll)
      return
    }
    if (files.length >= 1 && navigator.canShare?.(payloadOne)) {
      await navigator.share(payloadOne)
      return
    }
    if (navigator.share) {
      await navigator.share(payloadLink)
      return
    }
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
  } catch {
    // user cancelled — ignore
  }
}
