/**
 * Lightweight security self-check.
 * Fails if raw API key secrets leak into tracked sources.
 * (Client may use import.meta.env.VITE_GOOGLE_* — values come from env, not repo.)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fail = (msg) => {
  console.error('[security]', msg)
  process.exit(1)
}

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

const roots = ['src', 'scripts', 'api', 'index.html', 'package.json', 'README.md', 'Project.md', '.env.example']
const files = []
for (const g of roots) {
  const p = path.join(ROOT, g)
  if (!fs.existsSync(p)) continue
  if (fs.statSync(p).isDirectory()) walk(p, files)
  else files.push(p)
}

const secretRe = /AIzaSy[0-9A-Za-z_-]{20,}/g
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  if (secretRe.test(text)) fail(`API key-like secret in ${path.relative(ROOT, f)}`)
}

if (fs.existsSync(path.join(ROOT, '.env.local'))) {
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')
  if (!gitignore.split(/\r?\n/).some((l) => l.trim() === '.env*' || l.trim() === '.env.local')) {
    fail('.env.local exists but .gitignore does not cover .env*')
  }
}

console.log('[security] self-check OK')
