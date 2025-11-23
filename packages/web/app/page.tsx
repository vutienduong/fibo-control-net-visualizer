'use client'
import { useState, useEffect, useRef } from 'react'
import { validateFIBOJson } from '@/lib/validation'
import { saveToHistory, saveCurrentSession, loadCurrentSession, type SweepSession } from '@/lib/history'
import JsonEditor from './components/JsonEditor'
import HistoryPanel from './components/HistoryPanel'
import LazyImage from './components/LazyImage'

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
  queuedAt?: number
  startedAt?: number
  completedAt?: number
  renderTime?: number
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
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([])
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  // Load current session on mount
  useEffect(() => {
    const session = loadCurrentSession()
    if (session) {
      setBase(session.baseJson)
      setXPath(session.xPath)
      setXVals(session.xVals)
      setYPath(session.yPath)
      setYVals(session.yVals)
    }
  }, [])

  function loadPreset(presetKey: keyof typeof PRESETS) {
    const preset = PRESETS[presetKey]
    setXPath(preset.x.path)
    setXVals(preset.x.values)
    setYPath(preset.y.path)
    setYVals(preset.y.values)
    setPlan([])
    setJobs([])
  }

  function loadFromHistory(session: SweepSession) {
    setBase(session.baseJson)
    setXPath(session.xPath)
    setXVals(session.xVals)
    setYPath(session.yPath)
    setYVals(session.yVals)
    setPlan([])
    setJobs([])
    setValidationError('')
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

    // Save to history
    saveToHistory({
      baseJson: base,
      xPath,
      xVals,
      yPath,
      yVals,
      planCount: j.plan.length,
    })

    // Save current session for recovery
    saveCurrentSession({
      baseJson: base,
      xPath,
      xVals,
      yPath,
      yVals,
      planCount: j.plan.length,
    })
  }

  async function queueRenders() {
    const queueTime = Date.now()
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
      hash: e.hash,
      queuedAt: queueTime
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

    // Merge new statuses with existing timestamps
    const now = Date.now()
    const updatedJobs = data.statuses.map((newJob: JobStatus) => {
      const existingJob = jobs.find(j => j.jobId === newJob.jobId)
      if (!existingJob) return newJob

      const updated = { ...existingJob, ...newJob }

      // Track when job starts rendering (queued -> active)
      if (existingJob.status === 'queued' && newJob.status === 'active' && !updated.startedAt) {
        updated.startedAt = now
      }

      // Track when job completes and calculate render time
      if (newJob.status === 'completed' && !updated.completedAt) {
        updated.completedAt = now
        if (updated.startedAt) {
          updated.renderTime = now - updated.startedAt
        }
      }

      return updated
    })

    setJobs(updatedJobs)

    // Stop polling if all jobs are completed or failed
    const allDone = updatedJobs.every((s: JobStatus) =>
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

  // Calculate time estimation
  const jobsWithRenderTime = jobs.filter(j => j.renderTime && j.renderTime > 0)
  const avgRenderTime = jobsWithRenderTime.length > 0
    ? jobsWithRenderTime.reduce((sum, j) => sum + (j.renderTime || 0), 0) / jobsWithRenderTime.length
    : 0
  const pendingJobs = jobs.filter(j => j.status === 'queued' || j.status === 'active')
  const estimatedTimeRemaining = avgRenderTime > 0 && pendingJobs.length > 0
    ? avgRenderTime * pendingJobs.length
    : 0

  function formatTime(ms: number): string {
    if (ms <= 0) return ''
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  function toggleCompareSelection(index: number) {
    if (selectedForCompare.includes(index)) {
      setSelectedForCompare(selectedForCompare.filter(i => i !== index))
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, index])
    } else {
      // Replace first selected with new one
      setSelectedForCompare([selectedForCompare[1], index])
    }
  }

  function navigateToCompare() {
    if (selectedForCompare.length !== 2) return

    const [idx1, idx2] = selectedForCompare
    const job1 = jobs[idx1]
    const job2 = jobs[idx2]

    if (!job1.result || !job2.result || !job1.json || !job2.json) return

    const params = new URLSearchParams({
      img1: job1.result.url,
      img2: job2.result.url,
      json1: encodeURIComponent(JSON.stringify(job1.json)),
      json2: encodeURIComponent(JSON.stringify(job2.json)),
    })

    window.open(`/compare?${params.toString()}`, '_blank')
  }

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
    <div className="p-4">
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <section className="card">
          <h2 className="text-xl font-bold mb-4">Base JSON</h2>
          <JsonEditor
            value={base}
            onChange={handleBaseChange}
            hasError={!!validationError}
            height="300px"
          />
          {validationError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
              ❌ {validationError}
            </div>
          )}
          <h3 className="mt-6 text-lg font-bold mb-3">Sweep Parameters</h3>

          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <span className="text-xs text-gray-500">Quick presets:</span>
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(key => (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                className="px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors text-xs font-medium"
              >
                {PRESETS[key].name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-700">X Path</span>
              <input value={xPath} onChange={e=>setXPath(e.target.value)} className="input py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-700">X Values</span>
              <input value={xVals} onChange={e=>setXVals(e.target.value)} className="input py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-700">Y Path</span>
              <input value={yPath} onChange={e=>setYPath(e.target.value)} className="input py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-700">Y Values</span>
              <input value={yVals} onChange={e=>setYVals(e.target.value)} className="input py-2 text-sm" />
            </label>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={planSweep}
              disabled={!!validationError}
              className={`btn ${validationError ? 'bg-gray-400 cursor-not-allowed' : 'btn-primary'}`}
            >
              Plan Sweep
            </button>
            <button
              onClick={queueRenders}
              disabled={!plan.length}
              className={`btn ${plan.length ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-400 cursor-not-allowed text-white'}`}
            >
              Queue Renders ({plan.length})
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-bold mb-4">Planned Variants</h2>
          <p className="mb-3 text-gray-700">{plan.length} variants</p>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-auto">
            {plan.slice(0,12).map((p,i)=>(
              <pre key={i} className="text-[10px] bg-gray-100 p-2 overflow-auto max-h-32 rounded font-mono">{JSON.stringify(p.deltas, null, 2)}</pre>
            ))}
          </div>
        </section>
      </div>

      {jobs.length > 0 && (
        <section className="mt-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <h2 className="text-xl font-bold">Render Progress</h2>
            <div className="flex gap-3 items-center flex-wrap">
              {isPolling && <span className="text-sm text-primary-600 animate-pulse">⟳ Polling...</span>}
              <span className="text-sm font-bold text-gray-700">{completedJobs.length} / {jobs.length} completed ({progressPercent}%)</span>
              {estimatedTimeRemaining > 0 && (
                <span className="text-sm text-gray-600">
                  ⏱ ETA: {formatTime(estimatedTimeRemaining)}
                  {avgRenderTime > 0 && <span className="text-xs ml-1">({formatTime(avgRenderTime)}/img)</span>}
                </span>
              )}
              {selectedForCompare.length === 2 && (
                <button
                  onClick={navigateToCompare}
                  className="px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors text-xs font-bold"
                >
                  🔍 Compare Selected
                </button>
              )}
              {completedJobs.length > 0 && (
                <button
                  onClick={exportResults}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs font-bold"
                >
                  ⬇ Export ZIP
                </button>
              )}
            </div>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded mb-6 overflow-hidden">
            <div className="h-full bg-green-600 transition-all duration-300 ease-out" style={{width: `${progressPercent}%`}} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {jobs.map((job, i) => (
              <div key={job.jobId} className={`rounded-lg p-3 bg-white dark:bg-gray-800 relative shadow-sm ${selectedForCompare.includes(i) ? 'border-2 border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900' : 'border border-gray-200 dark:border-gray-700'}`}>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">Variant {i + 1}</div>
                {job.status === 'completed' && job.result ? (
                  <div>
                    <div className="relative">
                      <LazyImage
                        src={job.result.url}
                        alt={`Variant ${i + 1}`}
                        className="w-full h-auto rounded mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => toggleCompareSelection(i)}
                      />
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(i)}
                        onChange={() => toggleCompareSelection(i)}
                        className="absolute top-2 left-2 cursor-pointer w-4 h-4 z-10"
                      />
                    </div>
                    {job.result.cached && <div className="text-[9px] text-green-600 dark:text-green-400 font-medium">✓ Cached</div>}
                  </div>
                ) : job.status === 'failed' ? (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-[11px] rounded">
                    <div className="mb-2 font-bold">❌ Failed</div>
                    {job.attemptsMade && job.attemptsTotal && (
                      <div className="text-[9px] mb-2 text-red-800">
                        Attempts: {job.attemptsMade}/{job.attemptsTotal}
                      </div>
                    )}
                    {job.error && (
                      <div className="text-[9px] mb-2 break-words">
                        {job.error.substring(0, 100)}
                      </div>
                    )}
                    <button
                      onClick={() => retryJob(job)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-[10px] w-full"
                    >
                      ↻ Retry
                    </button>
                  </div>
                ) : job.status === 'active' ? (
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 text-primary-600 dark:text-primary-400 text-xs rounded text-center">
                    <div className="animate-spin-slow inline-block">⟳</div> Rendering...
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs rounded text-center">
                    ⋯ Queued
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <HistoryPanel onLoadSession={loadFromHistory} />
    </div>
  )
}
