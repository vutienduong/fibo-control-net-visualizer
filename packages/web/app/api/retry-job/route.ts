import { NextRequest } from 'next/server'
import { renderQueue } from '@/lib/queue'

export async function POST(req: NextRequest) {
  const { jobId, jobData } = await req.json()

  try {
    // Remove the old failed job if it exists
    const oldJob = await renderQueue.getJob(jobId)
    if (oldJob) {
      await oldJob.remove()
    }

    // Re-add the job with the same ID
    await renderQueue.add(
      'render',
      jobData,
      {
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )

    return Response.json({ success: true, jobId })
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
