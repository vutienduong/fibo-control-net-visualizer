import { Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const storageDir = process.env.STORAGE_DIR || './storage'
const modelVersion = process.env.MODEL_VERSION || 'fibo-v1'
const fiboUrl = process.env.FIBO_API_URL || 'https://api.bria.ai/v1/generate'
const fiboKey = process.env.FIBO_API_KEY || ''

const redis = new IORedis(redisUrl)
await fs.mkdir(storageDir, { recursive: true })

function keyFrom(hash: string) {
  return `${hash}.png`
}

async function renderWithFIBO(payload: any): Promise<Buffer> {
  // Placeholder: adjust to official FIBO API. This is a sketch.
  const resp = await fetch(fiboUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(fiboKey ? { 'Authorization': `Bearer ${fiboKey}` } : {})
    },
    body: JSON.stringify({
      model: payload.modelVersion || modelVersion,
      json: payload.json,
      seed: payload.seed
    })
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`FIBO error: ${resp.status} ${txt}`)
  }

  // Assume base64 image in response for starter; adapt to real shape.
  const data = await resp.json() as any
  const base64 = data.image_base64 || data.data || "" // adapt later
  if (!base64) throw new Error('No image data in FIBO response')
  return Buffer.from(base64, 'base64')
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
