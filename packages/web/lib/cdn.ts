/**
 * CDN Integration Utilities
 *
 * Supports multiple CDN providers for image serving:
 * - CloudFront (AWS)
 * - Cloudinary
 * - Cloudflare Images
 * - Custom CDN
 */

export type CDNProvider = 'cloudfront' | 'cloudinary' | 'cloudflare' | 'custom' | 'none'

export interface CDNConfig {
  provider: CDNProvider
  baseUrl?: string
  cloudName?: string // Cloudinary specific
  cloudflareAccountHash?: string // Cloudflare specific
  transformations?: {
    format?: 'webp' | 'avif' | 'jpeg' | 'png'
    quality?: number
    width?: number
    height?: number
  }
}

/**
 * Get CDN configuration from environment variables
 */
export function getCDNConfig(): CDNConfig {
  const provider = (process.env.NEXT_PUBLIC_CDN_PROVIDER || 'none') as CDNProvider

  return {
    provider,
    baseUrl: process.env.NEXT_PUBLIC_CDN_BASE_URL,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    cloudflareAccountHash: process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH,
    transformations: {
      format: (process.env.NEXT_PUBLIC_CDN_FORMAT as any) || 'webp',
      quality: parseInt(process.env.NEXT_PUBLIC_CDN_QUALITY || '85'),
    }
  }
}

/**
 * Transform local image URL to CDN URL
 */
export function getCDNUrl(localPath: string, config?: CDNConfig): string {
  const cdnConfig = config || getCDNConfig()

  // If CDN is disabled, return local path
  if (cdnConfig.provider === 'none' || !cdnConfig.baseUrl) {
    return localPath
  }

  // Extract filename from local path (e.g., /api/images/abc123.png -> abc123.png)
  const filename = localPath.split('/').pop() || ''
  const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')

  switch (cdnConfig.provider) {
    case 'cloudfront':
      return transformCloudFrontUrl(filenameWithoutExt, cdnConfig)

    case 'cloudinary':
      return transformCloudinaryUrl(filenameWithoutExt, cdnConfig)

    case 'cloudflare':
      return transformCloudflareUrl(filenameWithoutExt, cdnConfig)

    case 'custom':
      return transformCustomCDNUrl(filename, cdnConfig)

    default:
      return localPath
  }
}

/**
 * CloudFront URL transformation
 * Example: https://d111111abcdef8.cloudfront.net/images/abc123.webp?quality=85
 */
function transformCloudFrontUrl(filename: string, config: CDNConfig): string {
  const format = config.transformations?.format || 'webp'
  const quality = config.transformations?.quality || 85

  let url = `${config.baseUrl}/${filename}.${format}`

  const params = new URLSearchParams()
  if (quality < 100) params.append('quality', quality.toString())
  if (config.transformations?.width) params.append('width', config.transformations.width.toString())
  if (config.transformations?.height) params.append('height', config.transformations.height.toString())

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}

/**
 * Cloudinary URL transformation
 * Example: https://res.cloudinary.com/demo/image/upload/q_auto,f_webp/abc123.png
 */
function transformCloudinaryUrl(filename: string, config: CDNConfig): string {
  if (!config.cloudName) {
    throw new Error('Cloudinary cloud name is required')
  }

  const transformations: string[] = []

  // Quality
  if (config.transformations?.quality) {
    transformations.push(`q_${config.transformations.quality}`)
  } else {
    transformations.push('q_auto')
  }

  // Format
  if (config.transformations?.format) {
    transformations.push(`f_${config.transformations.format}`)
  }

  // Dimensions
  if (config.transformations?.width) {
    transformations.push(`w_${config.transformations.width}`)
  }
  if (config.transformations?.height) {
    transformations.push(`h_${config.transformations.height}`)
  }

  const transformStr = transformations.join(',')
  return `https://res.cloudinary.com/${config.cloudName}/image/upload/${transformStr}/${filename}.png`
}

/**
 * Cloudflare Images transformation
 * Example: https://imagedelivery.net/<account-hash>/<image-id>/<variant-name>
 */
function transformCloudflareUrl(filename: string, config: CDNConfig): string {
  if (!config.cloudflareAccountHash) {
    throw new Error('Cloudflare account hash is required')
  }

  // Cloudflare uses variants instead of URL parameters
  // You need to define variants in your Cloudflare dashboard
  const variant = config.transformations?.format || 'public'

  return `https://imagedelivery.net/${config.cloudflareAccountHash}/${filename}/${variant}`
}

/**
 * Custom CDN transformation
 * Simple base URL + filename approach
 */
function transformCustomCDNUrl(filename: string, config: CDNConfig): string {
  return `${config.baseUrl}/${filename}`
}

/**
 * Preload critical images using <link rel="preload">
 */
export function preloadImages(urls: string[]): void {
  if (typeof window === 'undefined') return

  urls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url
    document.head.appendChild(link)
  })
}

/**
 * Check if image is cached (via CDN or browser cache)
 */
export async function isImageCached(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const cacheControl = response.headers.get('cache-control')
    const cfCacheStatus = response.headers.get('cf-cache-status') // Cloudflare
    const xCache = response.headers.get('x-cache') // CloudFront

    return (
      cfCacheStatus === 'HIT' ||
      xCache === 'Hit from cloudfront' ||
      (cacheControl && cacheControl.includes('max-age'))
    )
  } catch {
    return false
  }
}
