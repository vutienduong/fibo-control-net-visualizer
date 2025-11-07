import { z } from 'zod'

// Basic FIBO JSON schema - expand based on actual FIBO API requirements
export const FIBOJsonSchema = z.object({
  seed: z.number().int().optional(),
  camera: z.object({
    fov: z.number().min(10).max(120).optional(),
    angle: z.string().optional(),
    tilt: z.number().optional(),
  }).optional(),
  lights: z.object({
    key: z.object({
      temperature: z.number().min(1000).max(10000).optional(),
      intensity: z.number().min(0).max(2).optional(),
    }).optional(),
  }).optional(),
  color_palette: z.object({
    name: z.string().optional(),
    saturation: z.number().min(0).max(1).optional(),
    warmth: z.number().min(-1).max(1).optional(),
  }).optional(),
  composition: z.object({
    rule_of_thirds: z.boolean().optional(),
    balance: z.number().min(0).max(1).optional(),
  }).optional(),
  subject: z.object({
    description: z.string(),
  }).optional(),
}).passthrough() // Allow additional properties

export function validateFIBOJson(json: string): { valid: boolean; error?: string; data?: any } {
  try {
    const parsed = JSON.parse(json)
    const result = FIBOJsonSchema.safeParse(parsed)

    if (result.success) {
      return { valid: true, data: result.data }
    } else {
      const firstError = result.error.errors[0]
      return {
        valid: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      }
    }
  } catch (e) {
    return { valid: false, error: 'Invalid JSON syntax' }
  }
}
