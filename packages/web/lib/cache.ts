/**
 * Advanced Caching Strategies
 *
 * Implements multiple caching layers:
 * - Browser cache (in-memory)
 * - Service Worker cache (offline support)
 * - HTTP cache headers
 */

export interface CacheConfig {
  maxAge: number // in seconds
  staleWhileRevalidate: number // in seconds
  namespace?: string
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 86400, // 24 hours
  staleWhileRevalidate: 604800, // 7 days
  namespace: 'fibo-cache-v1'
}

/**
 * In-memory cache for fast access
 */
class MemoryCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()

  set(key: string, data: any, ttl: number = 3600000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export const memoryCache = new MemoryCache()

/**
 * IndexedDB cache for larger data and persistence
 */
class IndexedDBCache {
  private dbName = 'fibo-image-cache'
  private storeName = 'images'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (typeof window === 'undefined') return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' })
        }
      }
    })
  }

  async set(key: string, data: any, ttl: number = 86400000): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      const request = store.put({
        key,
        data,
        timestamp: Date.now(),
        ttl
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async get(key: string): Promise<any | null> {
    if (!this.db) await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        const entry = request.result
        if (!entry) {
          resolve(null)
          return
        }

        const age = Date.now() - entry.timestamp
        if (age > entry.ttl) {
          this.delete(key)
          resolve(null)
          return
        }

        resolve(entry.data)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const indexedDBCache = new IndexedDBCache()

/**
 * Generate HTTP cache headers for API responses
 */
export function getCacheHeaders(config: Partial<CacheConfig> = {}): Record<string, string> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  return {
    'Cache-Control': `public, max-age=${cfg.maxAge}, stale-while-revalidate=${cfg.staleWhileRevalidate}`,
    'CDN-Cache-Control': `public, max-age=${cfg.maxAge}`,
    'Cloudflare-CDN-Cache-Control': `max-age=${cfg.maxAge}`,
  }
}

/**
 * Fetch with caching (memory + IndexedDB)
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  cacheKey?: string
): Promise<Response> {
  const key = cacheKey || url

  // Check memory cache first
  const memoryCached = memoryCache.get(key)
  if (memoryCached) {
    return new Response(JSON.stringify(memoryCached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'memory-hit' }
    })
  }

  // Check IndexedDB cache
  const dbCached = await indexedDBCache.get(key)
  if (dbCached) {
    // Also store in memory for faster subsequent access
    memoryCache.set(key, dbCached, 3600000)
    return new Response(JSON.stringify(dbCached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'db-hit' }
    })
  }

  // Fetch from network
  const response = await fetch(url, options)
  const data = await response.clone().json()

  // Store in both caches
  memoryCache.set(key, data, 3600000) // 1 hour in memory
  await indexedDBCache.set(key, data, 86400000) // 24 hours in IndexedDB

  return response
}

/**
 * Prefetch and cache multiple URLs
 */
export async function prefetchUrls(urls: string[]): Promise<void> {
  const promises = urls.map(url =>
    cachedFetch(url).catch(err => console.warn(`Failed to prefetch ${url}:`, err))
  )

  await Promise.all(promises)
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  memoryCache.clear()
  await indexedDBCache.clear()

  // Also clear service worker caches if available
  if (typeof window !== 'undefined' && 'caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  memorySize: number
  serviceWorkerCaches?: string[]
}> {
  const stats: any = {
    memorySize: memoryCache.size()
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    stats.serviceWorkerCaches = await caches.keys()
  }

  return stats
}
