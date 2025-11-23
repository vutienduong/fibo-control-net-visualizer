import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getCacheHeaders } from '@/lib/cache'
import { getCDNConfig, getCDNUrl } from '@/lib/cdn'

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const cdnConfig = getCDNConfig()

  // If CDN is enabled, redirect to CDN URL
  if (cdnConfig.provider !== 'none' && cdnConfig.baseUrl) {
    const cdnUrl = getCDNUrl(`/api/images/${params.name}`, cdnConfig)
    return Response.redirect(cdnUrl, 307)
  }

  // Serve from local storage
  const storage = process.env.STORAGE_DIR || './storage'
  const file = path.join(storage, params.name)

  try {
    const data = await fs.readFile(file)

    // Determine content type
    const ext = path.extname(params.name).toLowerCase()
    const contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.avif': 'image/avif'
    }[ext] || 'image/png'

    // Generate cache headers
    const cacheHeaders = getCacheHeaders({
      maxAge: 31536000, // 1 year for immutable images
      staleWhileRevalidate: 31536000
    })

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        ...cacheHeaders,
        'ETag': `"${params.name}"`,
        'X-Content-Source': 'local-storage'
      }
    })
  } catch (e) {
    return new Response('Not found', { status: 404 })
  }
}
