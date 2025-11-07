'use client'
import { useState } from 'react'

const SAMPLE_BASE = {
  seed: 1337,
  camera: { fov: 35, angle: "eye_level", tilt: 0 },
  lights: { key: { temperature: 5000, intensity: 0.9 } },
  color_palette: { name: "cinematic_neutral" },
  composition: { rule_of_thirds: true },
  subject: { description: "ceramic bottle on linen table" }
}

export default function HomePage() {
  const [base, setBase] = useState(JSON.stringify(SAMPLE_BASE, null, 2))
  const [xPath, setXPath] = useState("camera.fov")
  const [xVals, setXVals] = useState("25,35,45,55,65")
  const [yPath, setYPath] = useState("lights.key.temperature")
  const [yVals, setYVals] = useState("3000,4000,5000,6000,6500")
  const [plan, setPlan] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])

  async function planSweep() {
    const res = await fetch('/api/plan-sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base: JSON.parse(base),
        sweep: {
          x: { path: xPath, values: xVals.split(',').map(v=>v.trim()).map(Number) },
          y: { path: yPath, values: yVals.split(',').map(v=>v.trim()).map(Number) }
        }
      })
    })
    const j = await res.json()
    setPlan(j.plan)
  }

  async function queueRenders() {
    const res = await fetch('/api/queue-renders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, modelVersion: process.env.NEXT_PUBLIC_MODEL_VERSION || 'fibo-v1' })
    })
    const j = await res.json()
    setJobs(j.enqueued)
  }

  return (
    <div style={{display:'grid', gap:16, gridTemplateColumns:'1fr 1fr'}}>
      <section>
        <h2>Base JSON</h2>
        <textarea value={base} onChange={e=>setBase(e.target.value)} style={{width:'100%', height:260, fontFamily:'monospace'}}/>
        <h3 style={{marginTop:12}}>Sweep</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <label> X path <input value={xPath} onChange={e=>setXPath(e.target.value)} /></label>
          <label> X values <input value={xVals} onChange={e=>setXVals(e.target.value)} /></label>
          <label> Y path <input value={yPath} onChange={e=>setYPath(e.target.value)} /></label>
          <label> Y values <input value={yVals} onChange={e=>setYVals(e.target.value)} /></label>
        </div>
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <button onClick={planSweep}>Plan Sweep</button>
          <button onClick={queueRenders} disabled={!plan.length}>Queue Renders</button>
        </div>
      </section>
      <section>
        <h2>Planned Variants</h2>
        <p>{plan.length} variants</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6}}>
          {plan.slice(0,12).map((p,i)=>(
            <pre key={i} style={{fontSize:10, background:'#f6f6f6', padding:6, overflow:'auto', maxHeight:120}}>{JSON.stringify(p.deltas, null, 2)}</pre>
          ))}
        </div>
        <h2 style={{marginTop:12}}>Jobs</h2>
        <pre style={{fontSize:12, background:'#f6f6f6', padding:6, maxHeight:180, overflow:'auto'}}>{JSON.stringify(jobs, null, 2)}</pre>
      </section>
    </div>
  )
}
