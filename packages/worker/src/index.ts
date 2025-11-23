import { Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const storageDir = process.env.STORAGE_DIR || './storage'
const modelVersion = process.env.MODEL_VERSION || 'FIBO'

// API Provider Configuration
const apiProvider = process.env.FIBO_API_PROVIDER || 'bria' // 'bria' or 'fal'
const briaApiUrl = 'https://engine.prod.bria-api.com/v2/image/generate'
const falApiUrl = 'https://fal.run/bria/fibo/generate'
const briaApiToken = process.env.BRIA_API_TOKEN || process.env.FIBO_API_KEY || ''
const falApiKey = process.env.FAL_KEY || ''

// Default parameters
const defaultSteps = parseInt(process.env.FIBO_STEPS || '50')
const defaultGuidanceScale = parseInt(process.env.FIBO_GUIDANCE_SCALE || '5')
const defaultAspectRatio = process.env.FIBO_ASPECT_RATIO || '1:1'

const redis = new IORedis(redisUrl)
await fs.mkdir(storageDir, { recursive: true })

function keyFrom(hash: string) {
  return `${hash}.png`
}

/**
 * Poll a status URL until the request is completed
 */
async function pollStatusUntilComplete(statusUrl: string, headers: any, maxAttempts = 60): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

    const statusResp = await fetch(statusUrl, { headers })
    if (!statusResp.ok) {
      throw new Error(`Status polling failed: ${statusResp.status}`)
    }

    const statusData = await statusResp.json() as any

    if (statusData.status === 'completed' || statusData.status === 'success') {
      return statusData
    } else if (statusData.status === 'failed' || statusData.status === 'error') {
      throw new Error(`Generation failed: ${statusData.error || 'Unknown error'}`)
    }

    // Continue polling if status is 'pending', 'processing', etc.
  }

  throw new Error('Polling timeout: request did not complete in time')
}

/**
 * Download image from URL and return as Buffer
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Render image using Bria API
 */
async function renderWithBriaAPI(payload: any): Promise<Buffer> {
  if (!briaApiToken) {
    throw new Error('BRIA_API_TOKEN is required for Bria API')
  }

  const requestBody: any = {
    model_version: modelVersion,
    seed: payload.seed,
    steps_num: defaultSteps,
    guidance_scale: defaultGuidanceScale,
    aspect_ratio: defaultAspectRatio,
    sync: false // Use async mode
  }

  // Use structured_prompt if payload.json is an object, otherwise use prompt
  if (typeof payload.json === 'object') {
    requestBody.structured_prompt = JSON.stringify(payload.json)
  } else {
    requestBody.prompt = payload.json
  }

  const resp = await fetch(briaApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api_token': briaApiToken
    },
    body: JSON.stringify(requestBody)
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Bria API error: ${resp.status} ${txt}`)
  }

  const data = await resp.json() as any

  // If async mode, poll the status URL
  if (data.status_url) {
    console.log(`Polling status URL: ${data.status_url}`)
    const completedData = await pollStatusUntilComplete(data.status_url, {
      'api_token': briaApiToken
    })

    // Download the generated image
    const imageUrl = completedData.image_url || completedData.result?.image_url
    if (!imageUrl) {
      throw new Error('No image_url in completed response')
    }

    return await downloadImage(imageUrl)
  }

  // Sync mode - image should be in response
  if (data.image_url) {
    return await downloadImage(data.image_url)
  }

  throw new Error('No image data in Bria API response')
}

/**
 * Render image using Fal.ai API
 */
async function renderWithFalAPI(payload: any): Promise<Buffer> {
  if (!falApiKey) {
    throw new Error('FAL_KEY is required for Fal.ai API')
  }

  const requestBody: any = {
    seed: payload.seed,
    steps_num: defaultSteps,
    guidance_scale: defaultGuidanceScale,
    aspect_ratio: defaultAspectRatio,
    sync_mode: false
  }

  // Use structured_prompt if payload.json is an object, otherwise use prompt
  if (typeof payload.json === 'object') {
    requestBody.structured_prompt = payload.json
  } else {
    requestBody.prompt = payload.json
  }

  const resp = await fetch(falApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${falApiKey}`
    },
    body: JSON.stringify({
      input: requestBody
    })
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Fal.ai API error: ${resp.status} ${txt}`)
  }

  const data = await resp.json() as any

  // Fal.ai returns image URL directly in sync mode or after subscription
  const imageUrl = data.image?.url || data.images?.[0]?.url
  if (!imageUrl) {
    throw new Error('No image URL in Fal.ai response')
  }

  return await downloadImage(imageUrl)
}

/**
 * Main render function that routes to the appropriate API provider
 */
async function renderWithFIBO(payload: any): Promise<Buffer> {
  console.log(`Rendering with ${apiProvider} API (seed: ${payload.seed})`)

  if (apiProvider === 'fal') {
    return await renderWithFalAPI(payload)
  } else {
    return await renderWithBriaAPI(payload)
  }
}

const worker = new Worker('render', async job => {
  const { json, modelVersion, seed, hash } = job.data as any

  const fileName = keyFrom(hash)
  const filePath = path.join(storageDir, fileName)

  // If already exists, skip
  try {
    await fs.access(filePath)
    return { cached: true, url: `/api/images/${fileName}` }
  } catch {}

  const buf = await renderWithFIBO({ json, modelVersion, seed })
  await fs.writeFile(filePath, buf)
  return { cached: false, url: `/api/images/${fileName}` }
}, { connection: redis })

const events = new QueueEvents('render', { connection: redis })
events.on('completed', ({ jobId, returnvalue }) => {
  console.log('[render completed]', jobId, returnvalue)
})
events.on('failed', ({ jobId, failedReason }) => {
  console.error('[render failed]', jobId, failedReason)
})

console.log('Worker started. Queue: render')
