'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CompareContent() {
  const searchParams = useSearchParams()
  const img1 = searchParams.get('img1')
  const img2 = searchParams.get('img2')
  const json1Param = searchParams.get('json1')
  const json2Param = searchParams.get('json2')

  const [json1, setJson1] = useState<any>(null)
  const [json2, setJson2] = useState<any>(null)
  const [diff, setDiff] = useState<string[]>([])

  useEffect(() => {
    if (json1Param && json2Param) {
      try {
        const j1 = JSON.parse(decodeURIComponent(json1Param))
        const j2 = JSON.parse(decodeURIComponent(json2Param))
        setJson1(j1)
        setJson2(j2)

        // Calculate differences
        const differences: string[] = []
        const allKeys = new Set([...Object.keys(j1), ...Object.keys(j2)])

        function findDiffs(obj1: any, obj2: any, path: string = '') {
          if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
            if (obj1 !== obj2) {
              differences.push(`${path}: ${JSON.stringify(obj1)} → ${JSON.stringify(obj2)}`)
            }
            return
          }

          const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})])
          keys.forEach(key => {
            const newPath = path ? `${path}.${key}` : key
            if (obj1?.[key] !== obj2?.[key]) {
              if (typeof obj1?.[key] === 'object' && typeof obj2?.[key] === 'object') {
                findDiffs(obj1[key], obj2[key], newPath)
              } else {
                differences.push(`${newPath}: ${JSON.stringify(obj1?.[key])} → ${JSON.stringify(obj2?.[key])}`)
              }
            }
          })
        }

        findDiffs(j1, j2)
        setDiff(differences)
      } catch (e) {
        console.error('Failed to parse JSON:', e)
      }
    }
  }, [json1Param, json2Param])

  if (!img1 || !img2) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">No images to compare</h1>
        <a href="/" className="text-primary-600 hover:text-primary-700 underline">← Back to home</a>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Side-by-Side Comparison</h1>
        <a href="/" className="text-primary-600 hover:text-primary-700 underline">← Back to home</a>
      </div>

      {/* Images side by side */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-bold mb-3">Baseline</h2>
          <img src={img1} alt="Baseline" className="w-full border-2 border-gray-200 rounded-lg shadow-sm" />
        </div>
        <div className="card">
          <h2 className="text-lg font-bold mb-3">Variant</h2>
          <img src={img2} alt="Variant" className="w-full border-2 border-gray-200 rounded-lg shadow-sm" />
        </div>
      </div>

      {/* JSON diff */}
      {diff.length > 0 && (
        <div className="card bg-gray-50 mb-8">
          <h2 className="text-xl font-bold mb-4">Parameter Changes</h2>
          <div className="grid gap-3">
            {diff.map((change, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-gray-200 rounded font-mono text-xs hover:border-primary-300 transition-colors"
              >
                {change}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full JSON view */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-bold mb-3 text-gray-700">Baseline JSON</h3>
          <pre className="bg-gray-50 p-4 rounded text-[11px] overflow-auto max-h-96 font-mono border border-gray-200">
            {json1 ? JSON.stringify(json1, null, 2) : 'N/A'}
          </pre>
        </div>
        <div className="card">
          <h3 className="text-sm font-bold mb-3 text-gray-700">Variant JSON</h3>
          <pre className="bg-gray-50 p-4 rounded text-[11px] overflow-auto max-h-96 font-mono border border-gray-200">
            {json2 ? JSON.stringify(json2, null, 2) : 'N/A'}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-600">Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  )
}
