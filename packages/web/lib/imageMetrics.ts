/**
 * Image Comparison Metrics
 *
 * Utilities for comparing images using various metrics:
 * - SSIM (Structural Similarity Index)
 * - Perceptual Hash
 * - Pixel Difference
 */

/**
 * Calculate Structural Similarity Index (SSIM) between two images
 * Simplified implementation based on the SSIM algorithm
 */
export function calculateSSIM(
  img1Data: Uint8ClampedArray,
  img2Data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  if (img1Data.length !== img2Data.length) {
    throw new Error('Images must be the same size')
  }

  const windowSize = 8 // 8x8 window for SSIM calculation
  const c1 = (0.01 * 255) ** 2
  const c2 = (0.03 * 255) ** 2

  let totalSSIM = 0
  let windowCount = 0

  for (let y = 0; y <= height - windowSize; y += windowSize) {
    for (let x = 0; x <= width - windowSize; x += windowSize) {
      const ssim = calculateWindowSSIM(
        img1Data,
        img2Data,
        x,
        y,
        windowSize,
        width,
        c1,
        c2
      )
      totalSSIM += ssim
      windowCount++
    }
  }

  return totalSSIM / windowCount
}

function calculateWindowSSIM(
  img1: Uint8ClampedArray,
  img2: Uint8ClampedArray,
  startX: number,
  startY: number,
  size: number,
  width: number,
  c1: number,
  c2: number
): number {
  let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, sumProd = 0
  let count = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = ((startY + y) * width + (startX + x)) * 4
      // Use grayscale (average of RGB)
      const val1 = (img1[idx] + img1[idx + 1] + img1[idx + 2]) / 3
      const val2 = (img2[idx] + img2[idx + 1] + img2[idx + 2]) / 3

      sum1 += val1
      sum2 += val2
      sum1Sq += val1 * val1
      sum2Sq += val2 * val2
      sumProd += val1 * val2
      count++
    }
  }

  const mean1 = sum1 / count
  const mean2 = sum2 / count
  const variance1 = sum1Sq / count - mean1 * mean1
  const variance2 = sum2Sq / count - mean2 * mean2
  const covariance = sumProd / count - mean1 * mean2

  const numerator = (2 * mean1 * mean2 + c1) * (2 * covariance + c2)
  const denominator = (mean1 * mean1 + mean2 * mean2 + c1) * (variance1 + variance2 + c2)

  return numerator / denominator
}

/**
 * Calculate perceptual hash (pHash) for an image
 * Returns a 64-bit hash as a string
 */
export function calculatePerceptualHash(
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): string {
  // Resize to 32x32 and convert to grayscale
  const resized = resizeAndGrayscale(imageData, width, height, 32, 32)

  // Apply DCT (Discrete Cosine Transform) - simplified version
  const dct = applyDCT(resized, 32, 32)

  // Get top-left 8x8 (excluding DC component)
  const lowFreq = []
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (x !== 0 || y !== 0) {
        lowFreq.push(dct[y * 32 + x])
      }
    }
  }

  // Calculate median
  const sorted = [...lowFreq].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  // Generate hash: 1 if above median, 0 if below
  let hash = ''
  for (const val of lowFreq) {
    hash += val > median ? '1' : '0'
  }

  return hash
}

/**
 * Calculate Hamming distance between two perceptual hashes
 * Returns a similarity score (0-1, where 1 is identical)
 */
export function hashSimilarity(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be the same length')
  }

  let differences = 0
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      differences++
    }
  }

  return 1 - differences / hash1.length
}

/**
 * Calculate simple pixel difference percentage
 */
export function calculatePixelDifference(
  img1Data: Uint8ClampedArray,
  img2Data: Uint8ClampedArray,
  threshold: number = 10
): number {
  if (img1Data.length !== img2Data.length) {
    throw new Error('Images must be the same size')
  }

  let differentPixels = 0
  const totalPixels = img1Data.length / 4

  for (let i = 0; i < img1Data.length; i += 4) {
    const r1 = img1Data[i]
    const g1 = img1Data[i + 1]
    const b1 = img1Data[i + 2]
    const r2 = img2Data[i]
    const g2 = img2Data[i + 1]
    const b2 = img2Data[i + 2]

    const diff = Math.sqrt(
      (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
    )

    if (diff > threshold) {
      differentPixels++
    }
  }

  return (differentPixels / totalPixels) * 100
}

// Helper functions

function resizeAndGrayscale(
  imageData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): number[] {
  const result = new Array(dstWidth * dstHeight)
  const xRatio = srcWidth / dstWidth
  const yRatio = srcHeight / dstHeight

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const srcX = Math.floor(x * xRatio)
      const srcY = Math.floor(y * yRatio)
      const srcIdx = (srcY * srcWidth + srcX) * 4

      // Convert to grayscale
      const gray = (imageData[srcIdx] + imageData[srcIdx + 1] + imageData[srcIdx + 2]) / 3
      result[y * dstWidth + x] = gray
    }
  }

  return result
}

function applyDCT(data: number[], width: number, height: number): number[] {
  const result = new Array(width * height)

  for (let v = 0; v < height; v++) {
    for (let u = 0; u < width; u++) {
      let sum = 0

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixel = data[y * width + x]
          const cos1 = Math.cos((2 * x + 1) * u * Math.PI / (2 * width))
          const cos2 = Math.cos((2 * y + 1) * v * Math.PI / (2 * height))
          sum += pixel * cos1 * cos2
        }
      }

      const cu = u === 0 ? 1 / Math.sqrt(2) : 1
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1
      result[v * width + u] = 0.25 * cu * cv * sum
    }
  }

  return result
}

/**
 * Load image from URL and convert to ImageData
 */
export async function loadImageData(url: string): Promise<{
  data: Uint8ClampedArray
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)

      resolve({
        data: imageData.data,
        width: img.width,
        height: img.height
      })
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
