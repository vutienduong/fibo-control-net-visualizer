import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const storage = process.env.STORAGE_DIR || './storage'
  const file = path.join(storage, params.name)
  try {
    const data = await fs.readFile(file)
    return new Response(data, { headers: { 'Content-Type': 'image/png' } })
  } catch (e) {
    return new Response('Not found', { status: 404 })
  }
}
