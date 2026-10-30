import { createBrowserClient } from '@supabase/ssr'

function sanitizeEnv(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function createClient() {
  const url = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co'
  const key = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder'
  return createBrowserClient(url, key)
}
