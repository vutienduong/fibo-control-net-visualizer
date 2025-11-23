'use client'
import { useState, useEffect } from 'react'
import {
  calculateSSIM,
  calculatePerceptualHash,
  hashSimilarity,
  calculatePixelDifference,
  loadImageData
} from '@/lib/imageMetrics'

interface ImageMetricsProps {
  image1Url: string
  image2Url: string
}

interface Metrics {
  ssim: number
  hashSimilarity: number
  pixelDifference: number
  isCalculating: boolean
  error?: string
}

export default function ImageMetrics({ image1Url, image2Url }: ImageMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    ssim: 0,
    hashSimilarity: 0,
    pixelDifference: 0,
    isCalculating: true
  })

  useEffect(() => {
    calculateMetrics()
  }, [image1Url, image2Url])

  async function calculateMetrics() {
    setMetrics(prev => ({ ...prev, isCalculating: true, error: undefined }))

    try {
      // Load both images
      const [img1, img2] = await Promise.all([
        loadImageData(image1Url),
        loadImageData(image2Url)
      ])

      // Check if images are the same size
      if (img1.width !== img2.width || img1.height !== img2.height) {
        throw new Error('Images must be the same size for comparison')
      }

      // Calculate SSIM
      const ssim = calculateSSIM(img1.data, img2.data, img1.width, img1.height)

      // Calculate perceptual hashes
      const hash1 = calculatePerceptualHash(img1.data, img1.width, img1.height)
      const hash2 = calculatePerceptualHash(img2.data, img2.width, img2.height)
      const hashSim = hashSimilarity(hash1, hash2)

      // Calculate pixel difference
      const pixelDiff = calculatePixelDifference(img1.data, img2.data, 10)

      setMetrics({
        ssim,
        hashSimilarity: hashSim,
        pixelDifference: pixelDiff,
        isCalculating: false
      })
    } catch (error) {
      console.error('Failed to calculate metrics:', error)
      setMetrics(prev => ({
        ...prev,
        isCalculating: false,
        error: error instanceof Error ? error.message : 'Failed to calculate metrics'
      }))
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400'
    if (score >= 0.7) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  function getScoreLabel(score: number): string {
    if (score >= 0.95) return 'Nearly Identical'
    if (score >= 0.9) return 'Very Similar'
    if (score >= 0.7) return 'Similar'
    if (score >= 0.5) return 'Somewhat Similar'
    return 'Different'
  }

  if (metrics.isCalculating) {
    return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Image Analysis Metrics</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Calculating metrics...</span>
        </div>
      </div>
    )
  }

  if (metrics.error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
        <h3 className="text-lg font-bold mb-2 text-red-700 dark:text-red-400">Analysis Error</h3>
        <p className="text-sm text-red-600 dark:text-red-300">{metrics.error}</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Image Analysis Metrics</h3>

      <div className="grid md:grid-cols-3 gap-4">
        {/* SSIM */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            SSIM (Structural Similarity)
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(metrics.ssim)}`}>
            {(metrics.ssim * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {getScoreLabel(metrics.ssim)}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-primary-600 h-full transition-all duration-500"
              style={{ width: `${metrics.ssim * 100}%` }}
            />
          </div>
        </div>

        {/* Perceptual Hash */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Perceptual Hash
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(metrics.hashSimilarity)}`}>
            {(metrics.hashSimilarity * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {getScoreLabel(metrics.hashSimilarity)}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-primary-600 h-full transition-all duration-500"
              style={{ width: `${metrics.hashSimilarity * 100}%` }}
            />
          </div>
        </div>

        {/* Pixel Difference */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Pixel Difference
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(1 - metrics.pixelDifference / 100)}`}>
            {metrics.pixelDifference.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Changed Pixels
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-500"
              style={{ width: `${Math.min(metrics.pixelDifference, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
          📊 Understanding the Metrics
        </div>
        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p><strong>SSIM</strong>: Measures structural similarity (luminance, contrast, structure)</p>
          <p><strong>Perceptual Hash</strong>: Detects visual similarity based on image features</p>
          <p><strong>Pixel Difference</strong>: Percentage of pixels that changed significantly</p>
        </div>
      </div>
    </div>
  )
}
