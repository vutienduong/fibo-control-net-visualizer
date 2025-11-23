'use client'
import { SweepParameter } from '@/lib/advancedSweep'

interface GridAxisSelectorProps {
  parameters: SweepParameter[]
  selectedX: string
  selectedY: string
  fixedParams: Record<string, number>
  onAxisChange: (axis: 'x' | 'y', paramId: string) => void
  onFixedParamChange: (paramId: string, value: number) => void
}

export default function GridAxisSelector({
  parameters,
  selectedX,
  selectedY,
  fixedParams,
  onAxisChange,
  onFixedParamChange
}: GridAxisSelectorProps) {
  const availableParams = parameters.filter(p => p.values.length > 0)
  const otherParams = availableParams.filter(p => p.id !== selectedX && p.id !== selectedY)

  if (availableParams.length < 2) {
    return null
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-bold dark:text-gray-100">Grid View Configuration</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
            X Axis (Columns)
          </label>
          <select
            value={selectedX}
            onChange={(e) => onAxisChange('x', e.target.value)}
            className="input py-2 text-sm"
          >
            {availableParams.map(param => (
              <option key={param.id} value={param.id} disabled={param.id === selectedY}>
                {param.label || param.path}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
            Y Axis (Rows)
          </label>
          <select
            value={selectedY}
            onChange={(e) => onAxisChange('y', e.target.value)}
            className="input py-2 text-sm"
          >
            {availableParams.map(param => (
              <option key={param.id} value={param.id} disabled={param.id === selectedX}>
                {param.label || param.path}
              </option>
            ))}
          </select>
        </div>
      </div>

      {otherParams.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
            Fixed Parameters
          </div>
          <div className="space-y-3">
            {otherParams.map(param => {
              const currentValue = fixedParams[param.id] ?? param.values[0]
              const currentIndex = param.values.indexOf(currentValue)

              return (
                <div key={param.id}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {param.label || param.path}
                    </label>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      {currentValue}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={param.values.length - 1}
                    value={currentIndex}
                    onChange={(e) => {
                      const newValue = param.values[parseInt(e.target.value)]
                      onFixedParamChange(param.id, newValue)
                    }}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    <span>{param.values[0]}</span>
                    <span>{param.values[param.values.length - 1]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
