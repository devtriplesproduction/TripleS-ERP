/**
 * Utilities for Probation Period Calculation and Management
 */

/**
 * Calculates the probation end date given a joining date and duration in months.
 * Follows calendar month addition and handles end-of-month edge cases (e.g., Jan 31 + 1 month = Feb 28/29).
 * Returns 'YYYY-MM-DD' or null if joiningDate is missing or invalid.
 */
export function calculateProbationEndDate(
  joiningDateStr: string | null | undefined,
  durationMonths: number
): string | null {
  if (!joiningDateStr || typeof durationMonths !== 'number' || durationMonths <= 0) {
    return null
  }

  const rawDate = joiningDateStr.split('T')[0]?.trim()
  if (!rawDate) return null

  const parts = rawDate.split('-').map(Number)
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null
  }

  const [year, month, day] = parts // 1-indexed month
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  // Calculate target month and year
  const totalMonths = (month - 1) + durationMonths
  const targetYear = year + Math.floor(totalMonths / 12)
  const targetMonth0 = ((totalMonths % 12) + 12) % 12 // 0-indexed target month

  // Number of days in target month (day 0 of targetMonth0 + 1 gives last day)
  const daysInTargetMonth = new Date(targetYear, targetMonth0 + 1, 0).getDate()
  const targetDay = Math.min(day, daysInTargetMonth)

  const yStr = String(targetYear)
  const mStr = String(targetMonth0 + 1).padStart(2, '0')
  const dStr = String(targetDay).padStart(2, '0')

  return `${yStr}-${mStr}-${dStr}`
}

/**
 * Parses numeric months from a duration string (e.g., "3 Months" -> 3, "12 Months" -> 12).
 * Returns null if duration is empty, None, or Custom.
 */
export function parseMonthsFromDuration(duration: string | null | undefined): number | null {
  if (!duration) return null
  const trimmed = duration.trim()
  if (trimmed.toLowerCase() === 'none' || trimmed.toLowerCase() === 'custom') {
    return null
  }
  const match = trimmed.match(/^(\d+)\s*(?:month|months|m)?$/i)
  if (!match) return null
  const num = parseInt(match[1], 10)
  return isNaN(num) || num <= 0 ? null : num
}

/**
 * Determines which standard duration matches a given joining date and end date.
 * Options checked: 1, 2, 3, 6, 9, 12 months.
 */
export function getDurationForDates(
  joiningDateStr: string | null | undefined,
  endDateStr: string | null | undefined
): string {
  if (!endDateStr || !endDateStr.trim()) return 'none'
  if (!joiningDateStr || !joiningDateStr.trim()) return 'custom'

  const cleanEnd = endDateStr.split('T')[0]?.trim()
  const standardDurations = [1, 2, 3, 6, 9, 12]

  for (const m of standardDurations) {
    if (calculateProbationEndDate(joiningDateStr, m) === cleanEnd) {
      return `${m} Months`
    }
  }

  return 'custom'
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into "DD MMM YYYY" (e.g. 01 Oct 2026).
 * Returns fallback if invalid or missing.
 */
export function formatProbationDateDisplay(
  dateStr: string | null | undefined,
  fallback = '-'
): string {
  if (!dateStr) return fallback
  const clean = dateStr.split('T')[0]?.trim()
  if (!clean) return fallback

  const parts = clean.split('-').map(Number)
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  const fallbackDate = new Date(dateStr)
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return fallback
}

/**
 * Returns probation progress/status based on end date.
 */
export function getProbationStatus(
  probationEndDateStr: string | null | undefined
): {
  status: 'active' | 'completed' | 'none'
  label: string
  badgeVariant: 'amber' | 'emerald' | 'secondary'
} {
  if (!probationEndDateStr) {
    return { status: 'none', label: 'Not Configured', badgeVariant: 'secondary' }
  }

  const clean = probationEndDateStr.split('T')[0]?.trim()
  if (!clean) {
    return { status: 'none', label: 'Not Configured', badgeVariant: 'secondary' }
  }

  const parts = clean.split('-').map(Number)
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return { status: 'none', label: 'Not Configured', badgeVariant: 'secondary' }
  }

  const endDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999)
  const now = new Date()

  if (endDate.getTime() >= now.getTime()) {
    return { status: 'active', label: 'Active Probation', badgeVariant: 'amber' }
  } else {
    return { status: 'completed', label: 'Probation Completed', badgeVariant: 'emerald' }
  }
}
