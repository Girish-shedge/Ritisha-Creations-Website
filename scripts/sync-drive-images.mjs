/**
 * Build-time: list Drive category folders → download → WebP compress →
 * write public/gallery + src/data/categories.generated.ts
 *
 * Cache key: Drive file id + modifiedTime (skip unchanged).
 *
 * Env: GOOGLE_API_KEY + GOOGLE_DRIVE_FOLDER_ID
 *      (also accepts VITE_GOOGLE_DRIVE_API_KEY / VITE_DRIVE_FOLDER_ID)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'gallery')
const CACHE_PATH = path.join(ROOT, '.cache', 'drive-sync.json')
const GENERATED_TS = path.join(ROOT, 'src', 'data', 'categories.generated.ts')

const MAX_EDGE = 1400
const WEBP_QUALITY = 82
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.heif'])

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    const k = line.slice(0, i).trim()
    const v = line.slice(i + 1).trim()
    if (k && !(k in process.env)) process.env[k] = v
  }
}

loadEnvFile(path.join(ROOT, '.env.local'))
loadEnvFile(path.join(ROOT, '.env'))

const API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_DRIVE_API_KEY
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.VITE_DRIVE_FOLDER_ID
// API keys restricted by HTTP referrer reject empty Referer (Node fetch).
const REFERER =
  process.env.GOOGLE_API_REFERER ||
  process.env.VITE_GOOGLE_API_REFERER ||
  'http://localhost:5173/'

const fetchHeaders = { Referer: REFERER, Referrer: REFERER }

if (!API_KEY) {
  console.error('[sync-drive] Missing GOOGLE_API_KEY (or VITE_GOOGLE_DRIVE_API_KEY)')
  process.exit(1)
}
if (!FOLDER_ID) {
  console.error('[sync-drive] Missing GOOGLE_DRIVE_FOLDER_ID')
  process.exit(1)
}

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'category'
}

/** Split title into ≤18-char display lines (word-aware). */
function titleLines(title, max = 18) {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [title]
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && next.length > max) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function naturalNameCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function isImageFile(f) {
  if (f.mimeType?.startsWith('image/')) return true
  const ext = path.extname(f.name || '').toLowerCase()
  return IMAGE_EXTS.has(ext)
}

async function driveList(parentId, extraQ) {
  const files = []
  let pageToken
  do {
    const q = `'${parentId}' in parents and trashed = false and (${extraQ})`
    const params = new URLSearchParams({
      q,
      orderBy: 'name',
      pageSize: '100',
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,size)',
      key: API_KEY,
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: fetchHeaders,
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(`Drive list ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
    }
    files.push(...(json.files ?? []))
    pageToken = json.nextPageToken
  } while (pageToken)
  return files
}

async function downloadFile(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}&supportsAllDrives=true`
  const res = await fetch(url, { headers: fetchHeaders })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Download ${fileId} ${res.status}: ${body.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  } catch {
    return { files: {} }
  }
}

function writeCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
}

function publicUrl(slug, fileId) {
  return `/gallery/${slug}/${fileId}.webp`
}

function escapeTsString(s) {
  return JSON.stringify(s)
}

async function compressToWebp(buf, outPath) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })
  await sharp(buf, { failOn: 'none' })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(outPath)
}

async function main() {
  const t0 = Date.now()
  console.log('[sync-drive] Listing categories…')
  const folders = (await driveList(FOLDER_ID, `mimeType = '${FOLDER_MIME}'`)).sort((a, b) =>
    naturalNameCompare(a.name, b.name),
  )

  const cache = readCache()
  const usedSlugs = new Map()
  const categories = []
  let downloaded = 0
  let skipped = 0
  let bytesIn = 0
  let bytesOut = 0

  // Clean stale category dirs after we know current set
  const keepSlugs = new Set()

  for (const folder of folders) {
    const images = (await driveList(folder.id, `mimeType contains 'image/'`))
      .filter(isImageFile)
      .sort((a, b) => naturalNameCompare(a.name, b.name))

    if (images.length === 0) {
      console.log(`[sync-drive] skip empty: ${folder.name}`)
      continue
    }

    let slug = slugify(folder.name)
    if (usedSlugs.has(slug)) {
      const n = (usedSlugs.get(slug) || 1) + 1
      usedSlugs.set(slug, n)
      slug = `${slug}-${n}`
    } else {
      usedSlugs.set(slug, 1)
    }
    keepSlugs.add(slug)

    const catDir = path.join(OUT_DIR, slug)
    fs.mkdirSync(catDir, { recursive: true })

    const photoUrls = []
    for (const img of images) {
      const outPath = path.join(catDir, `${img.id}.webp`)
      const prev = cache.files[img.id]
      const fresh =
        prev &&
        prev.modifiedTime === img.modifiedTime &&
        prev.slug === slug &&
        fs.existsSync(outPath)

      if (fresh) {
        skipped++
        photoUrls.push(publicUrl(slug, img.id))
        continue
      }

      process.stdout.write(`[sync-drive] compress ${folder.name} / ${img.name} … `)
      const raw = await downloadFile(img.id)
      bytesIn += raw.length
      await compressToWebp(raw, outPath)
      const st = fs.statSync(outPath)
      bytesOut += st.size
      cache.files[img.id] = {
        modifiedTime: img.modifiedTime,
        slug,
        name: img.name,
        outBytes: st.size,
        inBytes: raw.length,
      }
      downloaded++
      photoUrls.push(publicUrl(slug, img.id))
      const ratio = raw.length ? ((st.size / raw.length) * 100).toFixed(0) : '?'
      console.log(`${(raw.length / 1024).toFixed(0)}KB → ${(st.size / 1024).toFixed(0)}KB (${ratio}%)`)
    }

    // Remove orphaned webps in this category
    for (const f of fs.readdirSync(catDir)) {
      if (!f.endsWith('.webp')) continue
      const id = f.slice(0, -5)
      if (!images.some((i) => i.id === id)) fs.unlinkSync(path.join(catDir, f))
    }

    const title = folder.name.trim()
    categories.push({
      id: slug,
      lines: titleLines(title),
      cardImage: photoUrls[0],
      galleryTitle: title,
      photos: photoUrls,
    })
  }

  // Remove category folders no longer in Drive
  if (fs.existsSync(OUT_DIR)) {
    for (const name of fs.readdirSync(OUT_DIR)) {
      const p = path.join(OUT_DIR, name)
      if (fs.statSync(p).isDirectory() && !keepSlugs.has(name)) {
        fs.rmSync(p, { recursive: true, force: true })
        console.log(`[sync-drive] removed stale category dir: ${name}`)
      }
    }
  }

  // Drop cache entries for deleted Drive files
  const liveIds = new Set()
  for (const cat of categories) {
    for (const url of cat.photos) liveIds.add(path.basename(url, '.webp'))
  }
  for (const id of Object.keys(cache.files)) {
    if (!liveIds.has(id)) delete cache.files[id]
  }

  writeCache(cache)

  const body = categories
    .map((c) => {
      const photos = c.photos.map((p) => `      ${escapeTsString(p)},`).join('\n')
      const lines = c.lines.map((l) => `      ${escapeTsString(l)},`).join('\n')
      return `  {
    id: ${escapeTsString(c.id)},
    lines: [
${lines}
    ],
    cardImage: ${escapeTsString(c.cardImage)},
    galleryTitle: ${escapeTsString(c.galleryTitle)},
    photos: [
${photos}
    ],
  },`
    })
    .join('\n')

  const ts = `/* AUTO-GENERATED by scripts/sync-drive-images.mjs — do not edit */
import type { CategoryData } from './categories'

export const CATEGORIES: CategoryData[] = [
${body}
]
`

  fs.mkdirSync(path.dirname(GENERATED_TS), { recursive: true })
  fs.writeFileSync(GENERATED_TS, ts)

  const ms = Date.now() - t0
  console.log(
    `[sync-drive] done: ${categories.length} categories, ${downloaded} compressed, ${skipped} cached, ${(bytesIn / 1024 / 1024).toFixed(2)}MB → ${(bytesOut / 1024 / 1024).toFixed(2)}MB in ${ms}ms`,
  )

  // ponytail: one runnable check
  if (categories.length === 0) {
    console.error('[sync-drive] FAIL: no categories with images')
    process.exit(1)
  }
  for (const c of categories) {
    if (!c.photos.length || c.cardImage !== c.photos[0]) {
      console.error('[sync-drive] FAIL: card/photos invariant', c.id)
      process.exit(1)
    }
    for (const url of c.photos) {
      const disk = path.join(ROOT, 'public', url.replace(/^\//, '').replaceAll('/', path.sep))
      if (!fs.existsSync(disk)) {
        console.error('[sync-drive] FAIL: missing file', disk)
        process.exit(1)
      }
    }
  }
  console.assert(titleLines('Hanging Toran').length >= 1)
  console.assert(titleLines('Circular Round Backdrop Extra Long').every((l) => l.length <= 18 || !l.includes(' ')))
  console.log('[sync-drive] self-check OK')
}

main().catch((err) => {
  console.error('[sync-drive]', err)
  process.exit(1)
})
