/**
 * Utility functions for Top Contributor and Leaderboard
 */

export interface LeaderboardEntry {
  rank: number
  employeeId: string
  employeeCode: string | null
  name: string
  avatarUrl: string | null
  totalHours: number
  formattedHours: string
  detailedHours: string
}

export interface PeriodInfo {
  year: number
  month: number
  monthName: string
  startDate: string
  endDate: string
}

export interface TopContributorData {
  topContributor: LeaderboardEntry | null
  leaderboard: LeaderboardEntry[]
  period: PeriodInfo
}

/**
 * Converts decimal hours into display format (e.g., 29.5 -> "29.5 hrs", 10.0 -> "10 hrs")
 * and detailed duration string (e.g., "29 hours 30 minutes") for accessibility / tooltip.
 */
export function formatHours(hours: number): { formatted: string; detailed: string } {
  const rounded = Math.round(hours * 10) / 10
  const isWhole = rounded % 1 === 0
  const formatted = `${isWhole ? rounded.toFixed(0) : rounded.toFixed(1)} hrs`

  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60

  let detailed = ''
  if (h === 0 && m === 0) {
    detailed = '0 hours'
  } else if (m === 0) {
    detailed = `${h} ${h === 1 ? 'hour' : 'hours'}`
  } else if (h === 0) {
    detailed = `${m} ${m === 1 ? 'minute' : 'minutes'}`
  } else {
    detailed = `${h} ${h === 1 ? 'hour' : 'hours'} ${m} ${m === 1 ? 'minute' : 'minutes'}`
  }

  return { formatted, detailed }
}

/**
 * Extract employee initials for avatar fallback.
 * Examples: "Omkar Sawant" -> "OS", "Prince" -> "PR"
 */
export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return '??'
  const trimmed = name.trim()
  if (!trimmed) return '??'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/**
 * Get distinct rank color matching black and white theme:
 * #1: High-contrast foreground
 * #2: Muted foreground
 * #3: Subtle muted foreground
 */
export function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return 'text-foreground font-bold'
    case 2:
      return 'text-muted-foreground font-semibold'
    case 3:
      return 'text-muted-foreground/70 font-semibold'
    default:
      return 'text-muted-foreground'
  }
}

