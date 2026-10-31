import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

export async function createClient() {
  const cookieStore = await cookies()
  const url =
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) ||
    'https://placeholder.supabase.co'
  const anonKey =
    sanitizeEnv(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_KEY
    ) || 'placeholder'

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function createAdminClient() {
  const url =
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) ||
    'https://placeholder.supabase.co'
  const serviceKey =
    sanitizeEnv(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_SECRET_KEY
    ) || 'placeholder'

  return createServerClient(
    url,
    serviceKey,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {}
      },
    }
  )
}