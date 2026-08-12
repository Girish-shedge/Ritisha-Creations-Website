/**
 * Pre-prod gate: Drive API Referer must stay allowlisted.
 * 1) Static — catalogue / media / vite import shared driveEnv.js (no drifted host)
 * 2) Live  — when an API key is present, ping Drive with that Referer
 *
 * Runs in `pnpm build` so a bad Referer fails before Vercel ships.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fail = (msg) => {
  console.error('[drive-referer]', msg)
  process.exit(1)
}

function loadEnvLocal() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    const k = line.slice(0, i).trim()
    const v = line.slice(i + 1).trim()
    if (k && !(k in process.env)) process.env[k] = v
  }
}

loadEnvLocal()

const { DRIVE_API_REFERER_DEFAULT, driveApiKey, driveFolderId, driveReferer } = await import(
  pathToFileURL(path.join(ROOT, 'api/driveEnv.js')).href,
)

if (DRIVE_API_REFERER_DEFAULT !== 'https://ritishacreations.vercel.app/') {
  fail(`DRIVE_API_REFERER_DEFAULT drifted: ${DRIVE_API_REFERER_DEFAULT}`)
}

const sources = [
  ['api/catalogue.js', /from ['"]\.\/driveEnv\.js['"]/],
  ['api/media.js', /from ['"]\.\/driveEnv\.js['"]/],
  ['vite.config.ts', /from ['"]\.\/api\/driveEnv\.js['"]/],
]
for (const [rel, re] of sources) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  if (!re.test(text)) fail(`${rel} must import shared driveEnv.js`)
  if (text.includes('https://rittishacreations.vercel.app/')) {
    fail(`${rel} hardcodes two-t Referer host; use driveReferer() only`)
  }
}

const key = driveApiKey()
const referer = driveReferer()
if (!key) {
  console.log('[drive-referer] no API key in env — static checks OK (skip live probe)')
  process.exit(0)
}

const folder = driveFolderId()
const params = new URLSearchParams({
  q: `'${folder}' in parents and trashed = false`,
  pageSize: '1',
  fields: 'files(id)',
  key,
})
const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
  headers: { Referer: referer },
})
const body = await res.text().catch(() => '')
if (!res.ok) {
  fail(
    `Drive live probe failed (${res.status}) with Referer ${referer}. ` +
      `Allowlist this host on the API key, or set GOOGLE_API_REFERER. ${body.slice(0, 180)}`,
  )
}

console.log('[drive-referer] self-check OK', { referer })
