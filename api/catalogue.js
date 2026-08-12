/**
 * Server-side Drive catalogue (avoids browser Referer blocks on the API key).
 * Env: VITE_GOOGLE_DRIVE_API_KEY / GOOGLE_API_KEY, VITE_DRIVE_FOLDER_ID,
 *      GOOGLE_API_REFERER / VITE_GOOGLE_API_REFERER
 */

import { driveApiKey, driveFolderId, driveReferer } from './driveEnv.js'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

function apiKey() {
  return driveApiKey()
}

function rootFolderId() {
  return driveFolderId()
}

function referer() {
  return driveReferer()
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function imageIndex(name) {
  const m = /^Image (\d+)\b/.exec(name)
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

/** Card lines: keep product name intact; put trailing `[size]` on its own line. */
function titleLines(name) {
  const trimmed = name.trim()
  const sizeMatch = trimmed.match(/^(.*?)\s*(\[[^\]]+\])\s*$/)
  const base = (sizeMatch ? sizeMatch[1] : trimmed).trim()
  const size = sizeMatch ? sizeMatch[2] : null

  const parts = base.split(/\s+/).filter(Boolean)
  let lines
  if (parts.length <= 3) lines = [base]
  else {
    const mid = Math.ceil(parts.length / 2)
    lines = [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')]
  }
  if (size) lines.push(size)
  return lines
}

function driveThumbUrl(fileId, width) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`
}

async function listChildren(parentId, extraQ, key) {
  const q = `'${parentId}' in parents and trashed = false and (${extraQ})`
  const params = new URLSearchParams({
    q,
    orderBy: 'name',
    pageSize: '100',
    fields: 'files(id,name,mimeType)',
    key,
  })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Referer: referer() },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive API ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.files || []
}

export async function buildCatalogue() {
  const key = apiKey()
  if (!key) throw new Error('Missing API key')

  const folders = await listChildren(rootFolderId(), `mimeType = '${FOLDER_MIME}'`, key)
  const categories = await Promise.all(
    folders.map(async (folder) => {
      const files = (await listChildren(folder.id, `mimeType contains 'image/'`, key))
        .filter((f) => f.mimeType.startsWith('image/'))
        .sort((a, b) => imageIndex(a.name) - imageIndex(b.name) || a.name.localeCompare(b.name))

      if (files.length === 0) return null

      const photos = files.map((f) => ({
        id: f.id,
        name: f.name,
        thumb: driveThumbUrl(f.id, 640),
        full: driveThumbUrl(f.id, 1200),
      }))
      const cover = files.find((f) => imageIndex(f.name) === 1) || files[0]
      const title = folder.name.trim()

      return {
        id: folder.id,
        slug: slugify(title),
        lines: titleLines(title),
        galleryTitle: title,
        photos,
        coverId: cover.id,
      }
    }),
  )

  return categories.filter(Boolean)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  try {
    const categories = await buildCatalogue()
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
    res.end(JSON.stringify({ categories }))
  } catch (err) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }))
  }
}
