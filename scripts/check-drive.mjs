/**
 * Smoke-check Drive catalogue. Reads .env.local.
 * Sends localhost Referer so website-restricted API keys work from CLI.
 * Usage: node scripts/check-drive.mjs
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const key = env.VITE_GOOGLE_DRIVE_API_KEY
const folder = env.VITE_DRIVE_FOLDER_ID

async function list(parentId, extraQ) {
  const q = extraQ
    ? `'${parentId}' in parents and trashed = false and (${extraQ})`
    : `'${parentId}' in parents and trashed = false`
  const params = new URLSearchParams({
    q,
    orderBy: 'name',
    pageSize: '100',
    fields: 'files(id,name,mimeType)',
    key,
  })
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Referer: 'http://localhost:5173/' },
  })
  const json = await res.json()
  if (!res.ok) {
    console.error('FAIL', res.status, JSON.stringify(json))
    process.exit(1)
  }
  return json.files ?? []
}

const folders = await list(folder, "mimeType = 'application/vnd.google-apps.folder'")
console.log('OK folders:', folders.map((f) => f.name).join(' | ') || '(none)')
for (const f of folders) {
  const images = await list(f.id, "mimeType contains 'image/'")
  console.log(`  ${f.name}: ${images.length} images`)
}
