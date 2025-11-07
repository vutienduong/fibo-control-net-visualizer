import crypto from 'crypto'

export function stableHash(obj: any) {
  const s = JSON.stringify(obj)
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)
}
