/**
 * Value Distribution Utilities
 *
 * Generate value sequences using different distribution strategies
 */

export type DistributionType = 'linear' | 'logarithmic' | 'exponential' | 'custom'

export interface DistributionConfig {
  type: DistributionType
  start: number
  end: number
  count: number
  base?: number // For logarithmic/exponential (default: 10 for log, e for exp)
}

/**
 * Generate values using linear distribution (equally spaced)
 */
export function generateLinear(start: number, end: number, count: number): number[] {
  if (count <= 1) return [start]

  const step = (end - start) / (count - 1)
  return Array.from({ length: count }, (_, i) => start + step * i)
}

/**
 * Generate values using logarithmic distribution
 * Values are spaced logarithmically between start and end
 */
export function generateLogarithmic(
  start: number,
  end: number,
  count: number,
  base: number = 10
): number[] {
  if (count <= 1) return [start]
  if (start <= 0 || end <= 0) {
    throw new Error('Logarithmic distribution requires positive values')
  }

  const logStart = Math.log(start) / Math.log(base)
  const logEnd = Math.log(end) / Math.log(base)
  const step = (logEnd - logStart) / (count - 1)

  return Array.from({ length: count }, (_, i) => {
    const logValue = logStart + step * i
    return Math.pow(base, logValue)
  })
}

/**
 * Generate values using exponential distribution
 * Values grow exponentially from start to end
 */
export function generateExponential(
  start: number,
  end: number,
  count: number,
  base: number = Math.E
): number[] {
  if (count <= 1) return [start]

  // Solve for the exponential curve: y = a * b^x
  // where y(0) = start and y(count-1) = end
  const ratio = end / start
  const growthRate = Math.pow(ratio, 1 / (count - 1))

  return Array.from({ length: count }, (_, i) => {
    return start * Math.pow(growthRate, i)
  })
}

/**
 * Generate values based on distribution configuration
 */
export function generateDistribution(config: DistributionConfig): number[] {
  switch (config.type) {
    case 'linear':
      return generateLinear(config.start, config.end, config.count)

    case 'logarithmic':
      return generateLogarithmic(config.start, config.end, config.count, config.base)

    case 'exponential':
      return generateExponential(config.start, config.end, config.count, config.base)

    case 'custom':
      // For custom, just return linear as default
      // Users can override by providing explicit values
      return generateLinear(config.start, config.end, config.count)

    default:
      return generateLinear(config.start, config.end, config.count)
  }
}

/**
 * Parse a values string that might contain:
 * - Comma-separated values: "1,2,3,4,5"
 * - Range notation: "1-10:5" (start-end:count)
 * - Distribution notation: "log:1-100:5" (type:start-end:count)
 */
export function parseValueString(input: string): number[] {
  input = input.trim()

  // Check for distribution notation: "log:1-100:5" or "exp:1-10:5"
  const distMatch = input.match(/^(log|exp|linear):([0-9.]+)-([0-9.]+):([0-9]+)(?::([0-9.]+))?$/)
  if (distMatch) {
    const [, type, start, end, count, base] = distMatch
    const config: DistributionConfig = {
      type: type as DistributionType,
      start: parseFloat(start),
      end: parseFloat(end),
      count: parseInt(count),
      base: base ? parseFloat(base) : undefined
    }
    return generateDistribution(config).map(v => parseFloat(v.toFixed(4)))
  }

  // Check for range notation: "1-10:5"
  const rangeMatch = input.match(/^([0-9.]+)-([0-9.]+):([0-9]+)$/)
  if (rangeMatch) {
    const [, start, end, count] = rangeMatch
    return generateLinear(parseFloat(start), parseFloat(end), parseInt(count))
      .map(v => parseFloat(v.toFixed(4)))
  }

  // Default: comma-separated values
  return input
    .split(',')
    .map(v => v.trim())
    .filter(v => v !== '')
    .map(Number)
    .filter(v => !isNaN(v))
}

/**
 * Format distribution config for display
 */
export function formatDistribution(config: DistributionConfig): string {
  switch (config.type) {
    case 'logarithmic':
      return `Logarithmic: ${config.start} to ${config.end} (${config.count} values, base ${config.base || 10})`
    case 'exponential':
      return `Exponential: ${config.start} to ${config.end} (${config.count} values)`
    case 'linear':
      return `Linear: ${config.start} to ${config.end} (${config.count} values)`
    default:
      return `Custom distribution`
  }
}
