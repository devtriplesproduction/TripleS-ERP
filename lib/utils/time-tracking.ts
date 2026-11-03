/**
 * Time Tracking Utility Helpers
 * Asia/Kolkata timezone compliant, pure helpers for calculations, path normalization, and formatting.
 * Safe for both Client Components and Server-side Actions.
 */

import { getTodayIST, getYesterdayIST, getDaysAgoIST } from '@/lib/utils/date'

export { getTodayIST, getYesterdayIST, getDaysAgoIST }

/**
 * Parse HH:mm string to minutes from midnight (0 - 1439).
 */
export function parseTimeMinutes(timeStr: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

/**
 * Converts ISO UTC timestamp string to Asia/Kolkata minutes from midnight.
 */
export function getISTTimeMinutes(isoString: string): number {
  if (!isoString) return 0
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return 0
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(d)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
    const h = hour === 24 ? 0 : hour
    return h * 60 + minute
  } catch {
    return 0
  }
}

/**
 * Normalizes raw storage paths by stripping leading slashes and redundant bucket prefixes.
 */
export function normalizeStoragePath(rawPath: string): string {
  let p = rawPath.trim()
  if (p.startsWith('screenshots/')) {
    p = p.slice('screenshots/'.length)
  }
  if (p.startsWith('/')) {
    p = p.slice(1)
  }
  return p
}

/**
 * Extracts normalized storage path from Supabase storage URLs (public or signed).
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const publicMarker = '/storage/v1/object/public/screenshots/'
    const pIdx = url.indexOf(publicMarker)
    if (pIdx !== -1) {
      return normalizeStoragePath(decodeURIComponent(url.slice(pIdx + publicMarker.length).split('?')[0]))
    }
    const signMarker = '/storage/v1/object/sign/screenshots/'
    const sIdx = url.indexOf(signMarker)
    if (sIdx !== -1) {
      return normalizeStoragePath(decodeURIComponent(url.slice(sIdx + signMarker.length).split('?')[0]))
    }
    const bucketMarker = '/screenshots/'
    const bIdx = url.lastIndexOf(bucketMarker)
    if (bIdx !== -1) {
      return normalizeStoragePath(decodeURIComponent(url.slice(bIdx + bucketMarker.length).split('?')[0]))
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Returns current month in Asia/Kolkata in YYYY-MM format.
 */
export function getCurrentMonthIST(): string {
  return getTodayIST().slice(0, 7)
}

/**
 * Formats ISO date string to readable 12-hour IST time (e.g. "09:30 AM").
 */
export function formatISTTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '-'
  try {
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d)
  } catch {
    return '-'
  }
}

/**
 * Formats minutes to "Xh YYm".
 */
export function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/**
 * Formats bytes to human-readable size string.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
