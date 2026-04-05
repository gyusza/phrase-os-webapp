/**
 * SM-2 Spaced Repetition Algorithm
 * Pure functions — no side effects, no DB access.
 */

export type SRSRating = 0 | 1 | 2 | 3 // Again | Hard | Good | Easy

export type SRSLevel = 'new' | 'learning' | 'young' | 'mature'

export interface SRSState {
  easeFactor: number
  interval: number // in days
  repetitionCount: number
  srsLevel: SRSLevel
}

export interface SRSResult extends SRSState {
  nextReview: string // ISO date string
}

export const RATING_LABELS: Record<SRSRating, string> = {
  0: 'Again',
  1: 'Hard',
  2: 'Good',
  3: 'Easy',
}

const MIN_EASE_FACTOR = 1.3

/**
 * Derive SRS level from interval length
 */
function deriveLevel(interval: number, repetitionCount: number): SRSLevel {
  if (repetitionCount === 0) return 'new'
  if (interval < 1) return 'learning'
  if (interval < 21) return 'young'
  return 'mature'
}

/**
 * Core SM-2 calculation
 * Takes current SRS state + user rating → returns new SRS state + next review date
 */
export function calculateNextReview(current: SRSState, rating: SRSRating): SRSResult {
  let { easeFactor, interval, repetitionCount } = current

  // Ease factor adjustment based on rating
  const easeAdjustments: Record<SRSRating, number> = {
    0: -0.3,  // Again: significant penalty
    1: -0.15, // Hard: slight penalty
    2: 0.0,   // Good: no change
    3: 0.15,  // Easy: bonus
  }

  easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor + easeAdjustments[rating])

  if (rating < 2) {
    // Failed — reset to learning phase
    repetitionCount = 0
    interval = 0
  } else {
    // Passed — advance
    repetitionCount += 1

    if (repetitionCount === 1) {
      interval = 1 // First successful review: 1 day
    } else if (repetitionCount === 2) {
      interval = 3 // Second: 3 days
    } else {
      interval = Math.round(interval * easeFactor)
    }

    // Easy bonus: 30% longer interval
    if (rating === 3) {
      interval = Math.round(interval * 1.3)
    }
  }

  const srsLevel = deriveLevel(interval, repetitionCount)

  // Calculate next review date
  const now = new Date()
  let nextReview: Date

  if (interval === 0) {
    // Learning phase: review again in 10 minutes (shown as same session or soon)
    nextReview = new Date(now.getTime() + 10 * 60 * 1000)
  } else {
    // Future date at start of day
    nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + interval)
    nextReview.setHours(0, 0, 0, 0)
  }

  return {
    easeFactor,
    interval,
    repetitionCount,
    srsLevel,
    nextReview: nextReview.toISOString(),
  }
}

/**
 * Parse SRS state from a vocabulary DB row
 */
export function parseSRSState(row: {
  ease_factor: string | null
  interval: number | null
  repetition_count: number | null
  srs_level: string | null
}): SRSState {
  return {
    easeFactor: parseFloat(row.ease_factor || '2.5'),
    interval: row.interval ?? 0,
    repetitionCount: row.repetition_count ?? 0,
    srsLevel: (row.srs_level as SRSLevel) || 'new',
  }
}

/**
 * Check if a vocabulary item is due for review
 */
export function isDue(nextReview: string | null): boolean {
  if (!nextReview) return true // Never reviewed = due
  return new Date(nextReview) <= new Date()
}
