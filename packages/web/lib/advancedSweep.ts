/**
 * Advanced Sweep Parameter Configuration
 *
 * Supports N-dimensional parameter sweeps
 */

export interface SweepParameter {
  id: string
  path: string
  values: number[]
  label?: string
}

export interface AdvancedSweepConfig {
  parameters: SweepParameter[]
  displayAxes?: {
    x: string // parameter id for X axis
    y: string // parameter id for Y axis
  }
}

/**
 * Generate all combinations for N-dimensional sweep
 */
export function generateNDimensionalSweep(
  baseJson: any,
  parameters: SweepParameter[]
): Array<{ json: any; deltas: Record<string, number>; coordinates: Record<string, number> }> {
  if (parameters.length === 0) return [{ json: baseJson, deltas: {}, coordinates: {} }]

  // Generate cartesian product of all parameter values
  const combinations: Array<Record<string, number>> = []

  function generateCombinations(paramIndex: number, current: Record<string, number>) {
    if (paramIndex >= parameters.length) {
      combinations.push({ ...current })
      return
    }

    const param = parameters[paramIndex]
    for (const value of param.values) {
      current[param.id] = value
      generateCombinations(paramIndex + 1, current)
    }
    delete current[param.id]
  }

  generateCombinations(0, {})

  // Apply combinations to base JSON
  return combinations.map(combo => {
    const variantJson = JSON.parse(JSON.stringify(baseJson))
    const deltas: Record<string, number> = {}
    const coordinates: Record<string, number> = {}

    for (const param of parameters) {
      const value = combo[param.id]
      setNestedValue(variantJson, param.path, value)
      deltas[param.path] = value
      coordinates[param.id] = value
    }

    return { json: variantJson, deltas, coordinates }
  })
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

/**
 * Filter variants to only show those matching specific coordinate values
 */
export function filterVariantsByCoordinates(
  variants: Array<{ json: any; deltas: Record<string, number>; coordinates: Record<string, number> }>,
  fixedCoordinates: Record<string, number>
): typeof variants {
  return variants.filter(variant => {
    return Object.entries(fixedCoordinates).every(([paramId, value]) => {
      return variant.coordinates[paramId] === value
    })
  })
}

/**
 * Get unique values for a specific parameter from variants
 */
export function getParameterValues(
  variants: Array<{ coordinates: Record<string, number> }>,
  paramId: string
): number[] {
  const values = new Set<number>()
  variants.forEach(v => {
    if (v.coordinates[paramId] !== undefined) {
      values.add(v.coordinates[paramId])
    }
  })
  return Array.from(values).sort((a, b) => a - b)
}
