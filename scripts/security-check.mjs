/**
 * Lightweight security self-check (ponytail: replaces full Strix run —
 * Strix needs Docker + LLM keys; upgrade path: docker run usestrix/strix).
 *
 * Fails if secrets leak into tracked sources or client Vite env.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fail = (msg) => {
  console.error('[security]', msg)
  process.exit(1)
}

const trackedGlobs = [
  'src',
  'scripts',
  'index.html',
  'package.json',
  'README.md',
  'Project.md',
  '.env.example',
]

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'gallery') continue
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|mjs|json|md|html|css|example)$/.test(name)) out.push(p)
  }
  return out
}

const files = []
for (const g of trackedGlobs) {
  const p = path.join(ROOT, g)
  if (fs.statSync(p).isDirectory()) walk(p, files)
  else files.push(p)
}

const secretRe = /AIzaSy[0-9A-Za-z_-]{20,}/g
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  if (secretRe.test(text)) fail(`API key-like secret in ${path.relative(ROOT, f)}`)
  if (/VITE_GOOGLE_DRIVE_API_KEY\s*=\s*['"]AIza/.test(text)) {
    fail(`Client-bundled Drive key assignment in ${path.relative(ROOT, f)}`)
  }
}

// Client must not import Drive keys via import.meta.env.VITE_*
const appSrc = walk(path.join(ROOT, 'src'))
for (const f of appSrc) {
  const text = fs.readFileSync(f, 'utf8')
  if (/import\.meta\.env\.VITE_GOOGLE/.test(text)) {
    fail(`Vite-exposed Google env in client: ${path.relative(ROOT, f)}`)
  }
}

if (fs.existsSync(path.join(ROOT, '.env.local'))) {
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
  if (!gitignore.split(/\r?\n/).some((l) => l.trim() === '.env*' || l.trim() === '.env.local')) {
    fail('.env.local exists but .gitignore does not cover .env*')
  }
}

console.assert(fs.existsSync(path.join(ROOT, 'scripts', 'sync-drive-images.mjs')), 'sync script')
console.log('[security] self-check OK')
