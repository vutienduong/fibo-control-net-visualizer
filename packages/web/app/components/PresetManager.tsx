'use client'
import { useRef } from 'react'

interface PresetData {
  baseJson: any
  xAxis?: {
    path: string
    values: number[]
    label: string
  }
  yAxis?: {
    path: string
    values: number[]
    label: string
  }
  name?: string
  description?: string
  timestamp?: string
}

interface PresetManagerProps {
  currentConfig: PresetData
  onImport: (preset: PresetData) => void
}

export default function PresetManager({ currentConfig, onImport }: PresetManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const preset: PresetData = {
      ...currentConfig,
      timestamp: new Date().toISOString(),
      name: currentConfig.name || 'Sweep Configuration',
    }

    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fibo-preset-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const preset = JSON.parse(text)
      onImport(preset)
    } catch (error) {
      console.error('Failed to import preset:', error)
      alert('Failed to import preset. Please ensure the file is a valid JSON preset.')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        className="px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium"
        title="Export current configuration as JSON preset"
      >
        <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Preset
      </button>

      <button
        onClick={handleImport}
        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        title="Import configuration from JSON preset file"
      >
        <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12" />
        </svg>
        Import Preset
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
