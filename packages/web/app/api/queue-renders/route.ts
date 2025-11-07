import { NextRequest } from 'next/server'
import { renderQueue } from '@/lib/queue'
import { stableHash } from '@/lib/hash'

export async function POST(req: NextRequest) {
  const { plan, modelVersion } = await req.json()
  const enqueued: any[] = []
  for (const { json } of plan) {
    const seed = json.seed ?? 1337
    const keyObj = { json, modelVersion, seed }
    const hash = stableHash(keyObj)
    await renderQueue.add(
      'render',
      { json, modelVersion, seed, hash },
      {
        jobId: hash,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
    enqueued.push({ hash, cached: false })
  }
  return Response.json({ enqueued })
}
