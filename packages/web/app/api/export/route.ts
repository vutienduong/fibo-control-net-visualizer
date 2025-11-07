import { NextRequest } from 'next/server'
import archiver from 'archiver'
import { Readable } from 'stream'
import fs from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const { jobResults, baseJson, sweepConfig } = await req.json()

  const storageDir = process.env.STORAGE_DIR || './storage'

  // Create a ZIP archive
  const archive = archiver('zip', { zlib: { level: 9 } })

  // Convert archive to web stream
  const readable = Readable.from(archive)

  // Add base.json
  archive.append(JSON.stringify(baseJson, null, 2), { name: 'metadata/base.json' })

  // Add sweep.json
  archive.append(JSON.stringify(sweepConfig, null, 2), { name: 'metadata/sweep.json' })

  // Generate variants.csv
  const csvHeader = 'variant_id,job_id,status,image_file,cached\n'
  const csvRows = jobResults.map((job: any, idx: number) => {
    const imageFile = job.result?.url ? path.basename(job.result.url) : 'N/A'
    return `${idx + 1},${job.jobId},${job.status},${imageFile},${job.result?.cached || false}`
  }).join('\n')
  archive.append(csvHeader + csvRows, { name: 'metadata/variants.csv' })

  // Add all completed images
  for (const job of jobResults) {
    if (job.status === 'completed' && job.result?.url) {
      const filename = path.basename(job.result.url)
      const imagePath = path.join(storageDir, filename)
      try {
        const imageData = await fs.readFile(imagePath)
        archive.append(imageData, { name: `images/${filename}` })
      } catch (e) {
        console.error(`Failed to add image ${filename}:`, e)
      }
    }
  }

  // Finalize the archive
  archive.finalize()

  // Return as a downloadable response
  return new Response(readable as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="fibo-sweep-${Date.now()}.zip"`,
    },
  })
}
