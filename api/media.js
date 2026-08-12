/**
 * Proxies a public Drive file for <img> / share use.
 * Env: VITE_GOOGLE_DRIVE_API_KEY or GOOGLE_API_KEY
 */
import { driveApiKey, driveReferer } from './driveEnv.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    res.statusCode = 400
    res.end('Bad id')
    return
  }

  const key = driveApiKey()
  if (!key) {
    res.statusCode = 500
    res.end('Missing API key')
    return
  }

  const referer = driveReferer()

  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}&supportsAllDrives=true`,
    { headers: { Referer: referer } },
  )
  if (!upstream.ok) {
    res.statusCode = upstream.status
    res.end('Upstream error')
    return
  }

  const type = upstream.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await upstream.arrayBuffer())
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(buf)
}
