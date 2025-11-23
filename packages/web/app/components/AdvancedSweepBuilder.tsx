'use client'
import { useState } from 'react'
import { SweepParameter } from '@/lib/advancedSweep'

interface AdvancedSweepBuilderProps {
  onParametersChange: (parameters: SweepParameter[]) => void
  initialParameters?: SweepParameter[]
}

export default function AdvancedSweepBuilder({
  onParametersChange,
  initialParameters = []
}: AdvancedSweepBuilderProps) {
  const [parameters, setParameters] = useState<SweepParameter[]>(initialParameters)

  const addParameter = () => {
    const newParam: SweepParameter = {
      id: `param_${Date.now()}`,
      path: '',
      values: [],
      label: `Parameter ${parameters.length + 1}`
    }
    const updated = [...parameters, newParam]
    setParameters(updated)
    onParametersChange(updated)
  }

  const removeParameter = (id: string) => {
    const updated = parameters.filter(p => p.id !== id)
    setParameters(updated)
    onParametersChange(updated)
  }

  const updateParameter = (id: string, field: keyof SweepParameter, value: any) => {
    const updated = parameters.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    )
    setParameters(updated)
    onParametersChange(updated)
  }

  const updateParameterValues = (id: string, valuesStr: string) => {
    const values = valuesStr
      .split(',')
      .map(v => v.trim())
      .filter(v => v !== '')
      .map(Number)
      .filter(v => !isNaN(v))

    updateParameter(id, 'values', values)
  }

  const getTotalCombinations = () => {
    if (parameters.length === 0) return 0
    return parameters.reduce((total, param) =>
      total * (param.values.length || 1), 1
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold dark:text-gray-100">
          Advanced Sweep Parameters
        </h3>
        <button
          onClick={addParameter}
          className="px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          + Add Parameter
        </button>
      </div>

      {parameters.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          Click "Add Parameter" to configure multi-dimensional sweeps
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {parameters.map((param, index) => (
              <div key={param.id} className="card p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    value={param.label || ''}
                    onChange={(e) => updateParameter(param.id, 'label', e.target.value)}
                    placeholder={`Parameter ${index + 1} Label`}
                    className="input py-1.5 text-sm font-medium flex-1 mr-2"
                  />
                  <button
                    onClick={() => removeParameter(param.id)}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      JSON Path
                    </label>
                    <input
                      type="text"
                      value={param.path}
                      onChange={(e) => updateParameter(param.id, 'path', e.target.value)}
                      placeholder="e.g., camera.fov"
                      className="input py-1.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Values (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={param.values.join(', ')}
                      onChange={(e) => updateParameterValues(param.id, e.target.value)}
                      placeholder="e.g., 20, 35, 50, 65"
                      className="input py-1.5 text-sm"
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {param.values.length} value{param.values.length !== 1 ? 's' : ''}
                  {param.values.length > 0 && `: ${param.values.join(', ')}`}
                </div>
              </div>
            ))}
          </div>

          <div className="card bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-200 dark:border-primary-800">
            <div className="text-sm font-bold text-primary-900 dark:text-primary-100 mb-1">
              Total Combinations
            </div>
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {getTotalCombinations().toLocaleString()} variants
            </div>
            <div className="text-xs text-primary-700 dark:text-primary-300 mt-1">
              {parameters.filter(p => p.values.length > 0).map((p, i) => (
                <span key={p.id}>
                  {p.label || p.path} ({p.values.length}){i < parameters.length - 1 ? ' × ' : ''}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
