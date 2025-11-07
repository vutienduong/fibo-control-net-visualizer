import { NextRequest } from 'next/server'
import { renderQueue } from '@/lib/queue'

export async function POST(req: NextRequest) {
  const { jobIds } = await req.json() as { jobIds: string[] }

  const statuses = await Promise.all(
    jobIds.map(async (jobId) => {
      const job = await renderQueue.getJob(jobId)
      if (!job) {
        return { jobId, status: 'unknown', result: null }
      }

      const state = await job.getState()
      const progress = job.progress
      const returnvalue = job.returnvalue
      const failedReason = job.failedReason
      const attemptsMade = job.attemptsMade
      const attemptsTotal = job.opts?.attempts || 1

      return {
        jobId,
        status: state,
        progress,
        result: returnvalue,
        error: failedReason,
        attemptsMade,
        attemptsTotal,
      }
    })
  )

  return Response.json({ statuses })
}
