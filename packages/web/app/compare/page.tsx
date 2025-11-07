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
      <div style={{padding: 32, textAlign: 'center'}}>
        <h1 style={{fontSize: 24, fontWeight: 'bold', marginBottom: 16}}>No images to compare</h1>
        <a href="/" style={{color: '#0070f3', textDecoration: 'underline'}}>← Back to home</a>
      </div>
    )
  }

  return (
    <div style={{padding: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
        <h1 style={{fontSize: 24, fontWeight: 'bold'}}>Side-by-Side Comparison</h1>
        <a href="/" style={{color: '#0070f3', textDecoration: 'underline'}}>← Back to home</a>
      </div>

      {/* Images side by side */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24}}>
        <div>
          <h2 style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>Baseline</h2>
          <img src={img1} alt="Baseline" style={{width: '100%', border: '2px solid #e5e7eb', borderRadius: 8}} />
        </div>
        <div>
          <h2 style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>Variant</h2>
          <img src={img2} alt="Variant" style={{width: '100%', border: '2px solid #e5e7eb', borderRadius: 8}} />
        </div>
      </div>

      {/* JSON diff */}
      {diff.length > 0 && (
        <div style={{background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16}}>
          <h2 style={{fontSize: 18, fontWeight: 'bold', marginBottom: 12}}>Parameter Changes</h2>
          <div style={{display: 'grid', gap: 8}}>
            {diff.map((change, idx) => (
              <div
                key={idx}
                style={{
                  padding: 8,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {change}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full JSON view */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24}}>
        <div>
          <h3 style={{fontSize: 14, fontWeight: 'bold', marginBottom: 8}}>Baseline JSON</h3>
          <pre style={{background: '#f9fafb', padding: 12, borderRadius: 4, fontSize: 11, overflow: 'auto', maxHeight: 300}}>
            {json1 ? JSON.stringify(json1, null, 2) : 'N/A'}
          </pre>
        </div>
        <div>
          <h3 style={{fontSize: 14, fontWeight: 'bold', marginBottom: 8}}>Variant JSON</h3>
          <pre style={{background: '#f9fafb', padding: 12, borderRadius: 4, fontSize: 11, overflow: 'auto', maxHeight: 300}}>
            {json2 ? JSON.stringify(json2, null, 2) : 'N/A'}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div style={{padding: 32}}>Loading comparison...</div>}>
      <CompareContent />
    </Suspense>
  )
}
