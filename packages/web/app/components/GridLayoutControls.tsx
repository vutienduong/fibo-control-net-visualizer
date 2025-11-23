'use client'
import { useState, useEffect } from 'react'

interface GridLayoutControlsProps {
  onColumnsChange?: (columns: number) => void
  onSizeChange?: (size: 'small' | 'medium' | 'large') => void
}

export default function GridLayoutControls({
  onColumnsChange,
  onSizeChange
}: GridLayoutControlsProps) {
  const [columns, setColumns] = useState(4)
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')

  useEffect(() => {
    // Load from localStorage
    const savedColumns = localStorage.getItem('gridColumns')
    const savedSize = localStorage.getItem('gridSize')

    if (savedColumns) setColumns(parseInt(savedColumns))
    if (savedSize) setSize(savedSize as 'small' | 'medium' | 'large')
  }, [])

  const handleColumnsChange = (newColumns: number) => {
    setColumns(newColumns)
    localStorage.setItem('gridColumns', newColumns.toString())
    onColumnsChange?.(newColumns)
  }

  const handleSizeChange = (newSize: 'small' | 'medium' | 'large') => {
    setSize(newSize)
    localStorage.setItem('gridSize', newSize)
    onSizeChange?.(newSize)
  }

  return (
    <div className="card bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap gap-6 items-center">
        {/* Columns Control */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
            Grid Columns: {columns}
          </label>
          <input
            type="range"
            min="2"
            max="8"
            value={columns}
            onChange={(e) => handleColumnsChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>2</span>
            <span>4</span>
            <span>6</span>
            <span>8</span>
          </div>
        </div>

        {/* Size Control */}
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2">
            Thumbnail Size
          </label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSizeChange(s)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  size === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function getGridClasses(columns: number, size: 'small' | 'medium' | 'large'): string {
  const columnClass = {
    2: 'grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    7: 'md:grid-cols-7',
    8: 'md:grid-cols-8',
  }[columns] || 'md:grid-cols-4'

  const sizeClass = {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6'
  }[size]

  return `grid grid-cols-1 ${columnClass} ${sizeClass}`
}

export function getImageSizeClass(size: 'small' | 'medium' | 'large'): string {
  return {
    small: 'max-h-32',
    medium: 'max-h-48',
    large: 'max-h-64'
  }[size]
}
