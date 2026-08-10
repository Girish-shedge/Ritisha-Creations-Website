/**
 * Generate favicon / PWA / Apple / OG icons from scripts/assets/brand-icon-source.png.
 * Run: pnpm icons
 *
 * Sizes follow the usual platform matrix (Windows ICO, desktop PNG, Android
 * manifest, Apple touch, share / Open Graph).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(root, 'scripts/assets/brand-icon-source.png')
const iconsDir = path.join(root, 'public/icons')
const publicDir = path.join(root, 'public')

/** @type {{ file: string, size: number, dir?: 'icons' | 'public' }[]} */
const pngs = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'favicon-48x48.png', size: 48 },
  { file: 'apple-touch-icon-152x152.png', size: 152 },
  { file: 'apple-touch-icon-167x167.png', size: 167 },
  { file: 'apple-touch-icon.png', size: 180 }, // iPhone home screen
  { file: 'icon-192.png', size: 192 }, // Android / PWA
  { file: 'icon-512.png', size: 512 }, // Android / PWA / share sheet
  { file: 'og-image.png', size: 1200 }, // Open Graph / Twitter / link previews
]

async function pngBuffer(size) {
  return sharp(sourcePath)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** Pack sized PNG buffers into a multi-size .ico (PNG-compressed entries). */
function pngsToIco(entriesIn) {
  const count = entriesIn.length
  const headerSize = 6 + count * 16
  let offset = headerSize
  const entries = entriesIn.map(({ buf, size }) => {
    const meta = { buf, size, offset, byteSize: buf.length }
    offset += buf.length
    return meta
  })

  const out = Buffer.alloc(offset)
  out.writeUInt16LE(0, 0)
  out.writeUInt16LE(1, 2)
  out.writeUInt16LE(count, 4)

  entries.forEach((e, i) => {
    const o = 6 + i * 16
    const dim = e.size >= 256 ? 0 : e.size
    out.writeUInt8(dim, o)
    out.writeUInt8(dim, o + 1)
    out.writeUInt8(0, o + 2)
    out.writeUInt8(0, o + 3)
    out.writeUInt16LE(1, o + 4)
    out.writeUInt16LE(32, o + 6)
    out.writeUInt32LE(e.byteSize, o + 8)
    out.writeUInt32LE(e.offset, o + 12)
    e.buf.copy(out, e.offset)
  })
  return out
}

async function main() {
  await mkdir(iconsDir, { recursive: true })
  const made = []

  for (const { file, size } of pngs) {
    const buf = await pngBuffer(size)
    const dest = path.join(iconsDir, file)
    await writeFile(dest, buf)
    made.push(`icons/${file} (${size}×${size})`)
  }

  const icoEntries = await Promise.all(
    [16, 32, 48].map(async (size) => ({ size, buf: await pngBuffer(size) })),
  )
  await writeFile(path.join(publicDir, 'favicon.ico'), pngsToIco(icoEntries))
  made.push('favicon.ico (16+32+48)')

  await writeFile(path.join(publicDir, 'favicon.png'), await pngBuffer(32))
  await writeFile(
    path.join(publicDir, 'apple-touch-icon.png'),
    await readFile(path.join(iconsDir, 'apple-touch-icon.png')),
  )
  made.push('favicon.png (32)', 'apple-touch-icon.png (180)')

  console.log('[icons] wrote:\n  - ' + made.join('\n  - '))
}

main().catch((err) => {
  console.error('[icons] failed:', err)
  process.exit(1)
})
