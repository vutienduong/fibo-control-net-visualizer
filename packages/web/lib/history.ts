/**
 * History/Session Management
 *
 * Manages saving and retrieving sweep configurations and results
 * using localStorage
 */

export interface SweepSession {
  id: string
  timestamp: number
  baseJson: string
  xPath: string
  xVals: string
  yPath: string
  yVals: string
  planCount: number
  completedCount?: number
}

const HISTORY_KEY = 'fibo_sweep_history'
const MAX_HISTORY_ITEMS = 20
const CURRENT_SESSION_KEY = 'fibo_current_session'

/**
 * Get all sweep history from localStorage
 */
export function getHistory(): SweepSession[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(HISTORY_KEY)
    if (!data) return []
    return JSON.parse(data) as SweepSession[]
  } catch (error) {
    console.error('Failed to load history:', error)
    return []
  }
}

/**
 * Save a new sweep session to history
 */
export function saveToHistory(session: Omit<SweepSession, 'id' | 'timestamp'>): SweepSession {
  if (typeof window === 'undefined') return { ...session, id: '', timestamp: 0 }

  const newSession: SweepSession = {
    ...session,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  try {
    const history = getHistory()
    const updatedHistory = [newSession, ...history].slice(0, MAX_HISTORY_ITEMS)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory))
    return newSession
  } catch (error) {
    console.error('Failed to save to history:', error)
    return newSession
  }
}

/**
 * Delete a sweep session from history
 */
export function deleteFromHistory(id: string): void {
  if (typeof window === 'undefined') return

  try {
    const history = getHistory()
    const updatedHistory = history.filter(item => item.id !== id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory))
  } catch (error) {
    console.error('Failed to delete from history:', error)
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error('Failed to clear history:', error)
  }
}

/**
 * Save current session state (for recovery on page reload)
 */
export function saveCurrentSession(data: Omit<SweepSession, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save current session:', error)
  }
}

/**
 * Load current session state
 */
export function loadCurrentSession(): Omit<SweepSession, 'id' | 'timestamp'> | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(CURRENT_SESSION_KEY)
    if (!data) return null
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load current session:', error)
    return null
  }
}

/**
 * Clear current session
 */
export function clearCurrentSession(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(CURRENT_SESSION_KEY)
  } catch (error) {
    console.error('Failed to clear current session:', error)
  }
}
