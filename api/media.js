/**
 * Proxies a public Drive file for <img> / share use.
 * Env: VITE_GOOGLE_DRIVE_API_KEY or GOOGLE_API_KEY
 *
 * Who called us (visible in Runtime Logs + X-Media-Via response header):
 *   - via=img   → browser <img> (Sec-Fetch-Dest: image)
 *   - via=fetch → JS fetch() e.g. share prefetch (Sec-Fetch-Dest: empty)
 * Optional ?via= override if you need a custom label (avoids cache split if unused).
 *
 * DEP0169 url.parse() is emitted by Vercel's Node launcher before this file runs —
 * silenced via vercel.json NODE_OPTIONS=--disable-warning=DEP0169 when supported.
 */
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { driveApiKey, driveReferer } from './driveEnv.js'

function mediaQuery(req) {
  // WHATWG URL — never legacy url.parse()
  try {
    const u = new URL(req.url || '/', 'http://localhost')
    return {
      id: u.searchParams.get('id') || '',
      via: u.searchParams.get('via') || '',
    }
  } catch {
    return { id: '', via: '' }
  }
}

function callerVia(req, viaParam) {
  if (viaParam) return viaParam
  const dest = String(req.headers['sec-fetch-dest'] || '')
  if (dest === 'image') return 'img'
  if (dest === 'empty') return 'fetch'
  return dest || 'unknown'
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const q = mediaQuery(req)
  const id = q.id
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    res.statusCode = 400
    res.end('Bad id')
    return
  }

  const via = callerVia(req, q.via)
  // Filter Runtime Logs by: "media":true  or  via=img / via=fetch
  console.info(JSON.stringify({ media: true, via, id }))

  const key = driveApiKey()
  if (!key) {
    res.statusCode = 500
    res.end('Missing API key')
    return
  }

  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}&supportsAllDrives=true`,
    { headers: { Referer: driveReferer() } },
  )
  if (!upstream.ok) {
    res.statusCode = upstream.status
    res.end('Upstream error')
    return
  }

  const type = upstream.headers.get('content-type') || 'image/jpeg'
  const len = upstream.headers.get('content-length')
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Media-Via', via)
  if (len) res.setHeader('Content-Length', len)

  // Stream Drive → client (better TTFB, no full-file double buffer)
  if (upstream.body) {
    await pipeline(Readable.fromWeb(upstream.body), res)
    return
  }

  res.end(Buffer.from(await upstream.arrayBuffer()))
}

if (process.env.NODE_ENV !== 'production') {
  const q = mediaQuery({ url: '/api/media?id=abc_123&via=share', headers: {} })
  console.assert(q.id === 'abc_123' && q.via === 'share', 'mediaQuery parses id/via')
}
