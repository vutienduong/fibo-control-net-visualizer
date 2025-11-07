import { NextRequest } from 'next/server'

type Sweep = { x: { path: string, values: any[] }, y?: { path: string, values: any[] } }

function setAtPath(obj: any, path: string, value: any) {
  const segs = path.split('.')
  const last = segs.pop()!
  let cur = obj
  for (const s of segs) cur = (cur[s] ??= {})
  cur[last] = value
}

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)) }

export async function POST(req: NextRequest) {
  const { base, sweep } = await req.json() as { base: any, sweep: Sweep }
  const xs = sweep.x.values
  const ys = sweep.y?.values ?? [null]
  const plan: any[] = []
  for (const xv of xs) {
    for (const yv of ys) {
      const j = clone(base)
      setAtPath(j, sweep.x.path, xv)
      const deltas: Record<string, any> = { [sweep.x.path]: xv }
      if (yv !== null) { setAtPath(j, sweep.y!.path, yv); deltas[sweep.y!.path] = yv }
      plan.push({ json: j, deltas })
    }
  }
  return Response.json({ plan, variants: plan.length })
}
