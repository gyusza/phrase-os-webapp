/**
 * Quiz utility functions — distractor generation, fuzzy matching, normalisation
 */

/**
 * Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Normalise special Danish characters to ASCII equivalents
 * æ → ae, ø → oe, å → aa
 */
export function normalizeSpecialChars(str: string): string {
  return str
    .replace(/æ/gi, 'ae')
    .replace(/ø/gi, 'oe')
    .replace(/å/gi, 'aa')
    .replace(/ü/gi, 'ue')
    .replace(/ö/gi, 'oe')
    .replace(/ä/gi, 'ae')
    .replace(/ß/gi, 'ss')
}

/**
 * Check if user input matches the target, allowing for:
 * - Case insensitivity
 * - Special character equivalents (æ=ae, ø=oe, å=aa)
 * - Small typos (Levenshtein distance ≤ threshold)
 */
export function fuzzyMatch(input: string, target: string, threshold: number = 2): {
  isMatch: boolean
  isExact: boolean
  distance: number
} {
  const normalInput = normalizeSpecialChars(input.trim().toLowerCase())
  const normalTarget = normalizeSpecialChars(target.trim().toLowerCase())

  // Exact match (after normalisation)
  if (normalInput === normalTarget) {
    return { isMatch: true, isExact: true, distance: 0 }
  }

  // Also check without normalisation for exact match
  if (input.trim().toLowerCase() === target.trim().toLowerCase()) {
    return { isMatch: true, isExact: true, distance: 0 }
  }

  // Fuzzy match with Levenshtein
  const distance = levenshtein(normalInput, normalTarget)

  // Scale threshold by word length — stricter for short words
  const adjustedThreshold = normalTarget.length <= 3 ? 1 : threshold

  return {
    isMatch: distance <= adjustedThreshold,
    isExact: false,
    distance,
  }
}

/**
 * Generate plausible wrong answers from the user's vocabulary pool
 * Avoids picking the correct answer or duplicates
 */
export function generateDistractors<T extends { id: string; translation: string }>(
  correctItem: T,
  allItems: T[],
  count: number = 3,
): T[] {
  const pool = allItems.filter(item => item.id !== correctItem.id)

  // Shuffle and pick
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const selected: T[] = []
  const usedTranslations = new Set([correctItem.translation.toLowerCase()])

  for (const item of shuffled) {
    if (selected.length >= count) break
    const translation = item.translation.toLowerCase()
    // Avoid duplicates that look the same
    if (!usedTranslations.has(translation)) {
      selected.push(item)
      usedTranslations.add(translation)
    }
  }

  return selected
}

/**
 * Shuffle an array (Fisher-Yates)
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Highlight differences between user input and correct answer
 * Returns an array of { char, isWrong } for rendering
 */
export function diffHighlight(input: string, target: string): { char: string; isWrong: boolean }[] {
  const result: { char: string; isWrong: boolean }[] = []

  for (let i = 0; i < Math.max(input.length, target.length); i++) {
    if (i < target.length) {
      const inputChar = i < input.length ? input[i] : ''
      const targetChar = target[i]
      result.push({
        char: targetChar,
        isWrong: inputChar.toLowerCase() !== targetChar.toLowerCase(),
      })
    }
  }

  return result
}
