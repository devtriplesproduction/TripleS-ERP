'use client'

/**
 * Utility to broadcast notification updates across components and browser tabs.
 */
export function broadcastNotificationUpdate() {
  if (typeof window === 'undefined') return
  try {
    const bc = new BroadcastChannel('erp-notifications-channel')
    bc.postMessage({ type: 'REFRESH_NOTIFICATIONS', timestamp: Date.now() })
    bc.close()
  } catch {
    // BroadcastChannel might not be supported in older environments
  }

  try {
    window.dispatchEvent(new CustomEvent('erp-notification-update', {
      detail: { timestamp: Date.now() }
    }))
  } catch {
    // Ignore error
  }
}
