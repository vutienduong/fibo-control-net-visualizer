'use client'
import { useState, useEffect, useRef } from 'react'
import { validateFIBOJson } from '@/lib/validation'

const SAMPLE_BASE = {
  seed: 1337,
  camera: { fov: 35, angle: "eye_level", tilt: 0 },
  lights: { key: { temperature: 5000, intensity: 0.9 } },
  color_palette: { name: "cinematic_neutral" },
  composition: { rule_of_thirds: true },
  subject: { description: "ceramic bottle on linen table" }
}

const PRESETS = {
  cinematic: {
    name: "🎥 Cinematic",
    x: { path: "camera.fov", values: "20,35,50,65,80" },
    y: { path: "camera.tilt", values: "-15,-5,0,5,15" },
  },
  studio: {
    name: "💡 Studio Lighting",
    x: { path: "lights.key.intensity", values: "0.4,0.6,0.8,1.0" },
    y: { path: "lights.key.temperature", values: "3000,4000,5000,6000,6500" },
  },
  color: {
    name: "🎨 Color Palette",
    x: { path: "color_palette.saturation", values: "0.2,0.4,0.6,0.8,1.0" },
    y: { path: "color_palette.warmth", values: "-0.5,-0.25,0,0.25,0.5" },
  },
}

type JobStatus = {
  jobId: string
  status: string
  progress?: number
  result?: { url: string; cached: boolean }
  error?: string
  attemptsMade?: number
  attemptsTotal?: number
  json?: any
  modelVersion?: string
  seed?: number
  hash?: string
}

export default function HomePage() {
  const [base, setBase] = useState(JSON.stringify(SAMPLE_BASE, null, 2))
  const [xPath, setXPath] = useState("camera.fov")
  const [xVals, setXVals] = useState("25,35,45,55,65")
  const [yPath, setYPath] = useState("lights.key.temperature")
  const [yVals, setYVals] = useState("3000,4000,5000,6000,6500")
  const [plan, setPlan] = useState<any[]>([])
  const [jobs, setJobs] = useState<JobStatus[]>([])
  const [isPolling, setIsPolling] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  function loadPreset(presetKey: keyof typeof PRESETS) {
    const preset = PRESETS[presetKey]
    setXPath(preset.x.path)
    setXVals(preset.x.values)
    setYPath(preset.y.path)
    setYVals(preset.y.values)
    setPlan([])
    setJobs([])
  }

  function handleBaseChange(newBase: string) {
    setBase(newBase)
    const validation = validateFIBOJson(newBase)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid JSON')
    } else {
      setValidationError('')
    }
  }

  async function planSweep() {
    // Validate JSON before planning
    const validation = validateFIBOJson(base)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid JSON')
      return
    }

    const res = await fetch('/api/plan-sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base: validation.data,
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
    setJobs(j.enqueued.map((e: any, idx: number) => ({
      jobId: e.hash,
      status: 'queued',
      result: null,
      json: plan[idx].json,
      modelVersion: process.env.NEXT_PUBLIC_MODEL_VERSION || 'fibo-v1',
      seed: plan[idx].json.seed ?? 1337,
      hash: e.hash
    })))
    setIsPolling(true)
  }

  async function retryJob(job: JobStatus) {
    const res = await fetch('/api/retry-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.jobId,
        jobData: {
          json: job.json,
          modelVersion: job.modelVersion,
          seed: job.seed,
          hash: job.hash
        }
      })
    })

    if (res.ok) {
      // Update job status to queued and restart polling
      setJobs(jobs.map(j => j.jobId === job.jobId ? { ...j, status: 'queued', error: undefined } : j))
      setIsPolling(true)
    }
  }

  async function pollJobStatus() {
    if (jobs.length === 0) return

    const jobIds = jobs.map(j => j.jobId)
    const res = await fetch('/api/job-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobIds })
    })
    const data = await res.json()
    setJobs(data.statuses)

    // Stop polling if all jobs are completed or failed
    const allDone = data.statuses.every((s: JobStatus) =>
      s.status === 'completed' || s.status === 'failed'
    )
    if (allDone) {
      setIsPolling(false)
    }
  }

  useEffect(() => {
    if (isPolling) {
      pollingInterval.current = setInterval(pollJobStatus, 2000)
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
    }
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current)
    }
  }, [isPolling, jobs])

  const completedJobs = jobs.filter(j => j.status === 'completed' && j.result)
  const progressPercent = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0

  async function exportResults() {
    const sweepConfig = {
      x: { path: xPath, values: xVals.split(',').map(v=>v.trim()).map(Number) },
      y: { path: yPath, values: yVals.split(',').map(v=>v.trim()).map(Number) }
    }

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobResults: jobs,
        baseJson: JSON.parse(base),
        sweepConfig
      })
    })

    if (res.ok) {
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fibo-sweep-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  }

  return (
    <div style={{padding: 16}}>
      <h1 style={{fontSize: 24, fontWeight: 'bold', marginBottom: 16}}>FIBO ControlNet Visualizer</h1>

      <div style={{display:'grid', gap:16, gridTemplateColumns:'1fr 1fr', marginBottom: 24}}>
        <section>
          <h2 style={{fontSize: 18, fontWeight: 'bold', marginBottom: 8}}>Base JSON</h2>
          <textarea
            value={base}
            onChange={e=>handleBaseChange(e.target.value)}
            style={{width:'100%', height:260, fontFamily:'monospace', padding: 8, border: validationError ? '2px solid #ef4444' : '1px solid #ccc', borderRadius: 4}}
          />
          {validationError && (
            <div style={{marginTop: 6, padding: 8, background: '#fee', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 12, color: '#dc2626'}}>
              ❌ {validationError}
            </div>
          )}
          <h3 style={{marginTop:16, fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>Sweep Parameters</h3>

          <div style={{display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap'}}>
            <span style={{fontSize: 12, color: '#6b7280', alignSelf: 'center'}}>Quick presets:</span>
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(key => (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                style={{padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: '500'}}
              >
                {PRESETS[key].name}
              </button>
            ))}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <label style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              <span style={{fontSize: 12, fontWeight: 'bold'}}>X Path</span>
              <input value={xPath} onChange={e=>setXPath(e.target.value)} style={{padding: 6, border: '1px solid #ccc', borderRadius: 4}} />
            </label>
            <label style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              <span style={{fontSize: 12, fontWeight: 'bold'}}>X Values</span>
              <input value={xVals} onChange={e=>setXVals(e.target.value)} style={{padding: 6, border: '1px solid #ccc', borderRadius: 4}} />
            </label>
            <label style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              <span style={{fontSize: 12, fontWeight: 'bold'}}>Y Path</span>
              <input value={yPath} onChange={e=>setYPath(e.target.value)} style={{padding: 6, border: '1px solid #ccc', borderRadius: 4}} />
            </label>
            <label style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              <span style={{fontSize: 12, fontWeight: 'bold'}}>Y Values</span>
              <input value={yVals} onChange={e=>setYVals(e.target.value)} style={{padding: 6, border: '1px solid #ccc', borderRadius: 4}} />
            </label>
          </div>
          <div style={{display:'flex', gap:8, marginTop:12}}>
            <button
              onClick={planSweep}
              disabled={!!validationError}
              style={{padding: '8px 16px', background: validationError ? '#ccc' : '#0070f3', color: 'white', border: 'none', borderRadius: 4, cursor: validationError ? 'not-allowed' : 'pointer', fontWeight: 'bold'}}
            >
              Plan Sweep
            </button>
            <button
              onClick={queueRenders}
              disabled={!plan.length}
              style={{padding: '8px 16px', background: plan.length ? '#10b981' : '#ccc', color: 'white', border: 'none', borderRadius: 4, cursor: plan.length ? 'pointer' : 'not-allowed', fontWeight: 'bold'}}
            >
              Queue Renders ({plan.length})
            </button>
          </div>
        </section>

        <section>
          <h2 style={{fontSize: 18, fontWeight: 'bold', marginBottom: 8}}>Planned Variants</h2>
          <p style={{marginBottom: 8}}>{plan.length} variants</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6, maxHeight: 360, overflow: 'auto'}}>
            {plan.slice(0,12).map((p,i)=>(
              <pre key={i} style={{fontSize:10, background:'#f6f6f6', padding:6, overflow:'auto', maxHeight:120, borderRadius: 4}}>{JSON.stringify(p.deltas, null, 2)}</pre>
            ))}
          </div>
        </section>
      </div>

      {jobs.length > 0 && (
        <section style={{marginTop: 24}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
            <h2 style={{fontSize: 18, fontWeight: 'bold'}}>Render Progress</h2>
            <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
              {isPolling && <span style={{fontSize: 14, color: '#0070f3'}}>⟳ Polling...</span>}
              <span style={{fontSize: 14, fontWeight: 'bold'}}>{completedJobs.length} / {jobs.length} completed ({progressPercent}%)</span>
              {completedJobs.length > 0 && (
                <button
                  onClick={exportResults}
                  style={{padding: '6px 12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold'}}
                >
                  ⬇ Export ZIP
                </button>
              )}
            </div>
          </div>

          <div style={{width: '100%', height: 8, background: '#e5e7eb', borderRadius: 4, marginBottom: 16, overflow: 'hidden'}}>
            <div style={{height: '100%', background: '#10b981', width: `${progressPercent}%`, transition: 'width 0.3s ease'}} />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12}}>
            {jobs.map((job, i) => (
              <div key={job.jobId} style={{border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fff'}}>
                <div style={{fontSize: 10, color: '#6b7280', marginBottom: 4}}>Variant {i + 1}</div>
                {job.status === 'completed' && job.result ? (
                  <div>
                    <img
                      src={job.result.url}
                      alt={`Variant ${i + 1}`}
                      style={{width: '100%', height: 'auto', borderRadius: 4, marginBottom: 4}}
                    />
                    {job.result.cached && <div style={{fontSize: 9, color: '#10b981'}}>✓ Cached</div>}
                  </div>
                ) : job.status === 'failed' ? (
                  <div style={{padding: 8, background: '#fee', color: '#dc2626', fontSize: 11, borderRadius: 4}}>
                    <div style={{marginBottom: 6}}>❌ Failed</div>
                    {job.attemptsMade && job.attemptsTotal && (
                      <div style={{fontSize: 9, marginBottom: 6, color: '#991b1b'}}>
                        Attempts: {job.attemptsMade}/{job.attemptsTotal}
                      </div>
                    )}
                    {job.error && (
                      <div style={{fontSize: 9, marginBottom: 6, wordBreak: 'break-word'}}>
                        {job.error.substring(0, 100)}
                      </div>
                    )}
                    <button
                      onClick={() => retryJob(job)}
                      style={{padding: '4px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10, width: '100%'}}
                    >
                      ↻ Retry
                    </button>
                  </div>
                ) : job.status === 'active' ? (
                  <div style={{padding: 16, background: '#eff6ff', color: '#0070f3', fontSize: 12, borderRadius: 4, textAlign: 'center'}}>
                    ⟳ Rendering...
                  </div>
                ) : (
                  <div style={{padding: 16, background: '#f9fafb', color: '#6b7280', fontSize: 12, borderRadius: 4, textAlign: 'center'}}>
                    ⋯ Queued
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
