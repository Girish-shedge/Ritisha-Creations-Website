import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { loadEnv } from 'vite'

function driveMediaProxy(): Plugin {
  return {
    name: 'drive-media-proxy',
    configureServer(server) {
      server.middlewares.use('/api/media', async (req, res) => {
        try {
          const env = loadEnv(server.config.mode, server.config.root, '')
          const key = env.VITE_GOOGLE_DRIVE_API_KEY
          const url = new URL(req.url || '', 'http://localhost')
          const id = url.searchParams.get('id') || ''
          if (!key || !/^[a-zA-Z0-9_-]+$/.test(id)) {
            res.statusCode = 400
            res.end('Bad request')
            return
          }
          const upstream = await fetch(
            `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${key}`,
          )
          if (!upstream.ok) {
            res.statusCode = upstream.status
            res.end('Upstream error')
            return
          }
          res.statusCode = 200
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
          res.setHeader('Cache-Control', 'public, max-age=86400')
          const buf = Buffer.from(await upstream.arrayBuffer())
          res.end(buf)
        } catch (e) {
          res.statusCode = 500
          res.end(String(e))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), driveMediaProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
  },
})
