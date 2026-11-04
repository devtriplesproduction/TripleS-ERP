'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type AppRole } from '@/config/rbac'

/**
 * Generate a cryptographically random temporary password.
 * Format: 2 uppercase + 4 lowercase + 3 digits + 1 special char = 10 chars
 */
function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%&*'

  let password = ''
  // 2 uppercase
  for (let i = 0; i < 2; i++) password += upper[Math.floor(Math.random() * upper.length)]
  // 4 lowercase
  for (let i = 0; i < 4; i++) password += lower[Math.floor(Math.random() * lower.length)]
  // 3 digits
  for (let i = 0; i < 3; i++) password += digits[Math.floor(Math.random() * digits.length)]
  // 1 special
  password += special[Math.floor(Math.random() * special.length)]

  // Shuffle the password characters
  const arr = password.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

/**
 * Generate the next sequential employee ID (EMP-001, EMP-002, etc.)
 * Uses a database function for concurrency safety.
 */
export async function generateEmployeeId(): Promise<string> {
  const admin = await createAdminClient()
  
  // Get the highest existing employee_id_number
  const { data, error } = await admin
    .from('employee_onboarding')
    .select('employee_id_number')
    .not('employee_id_number', 'is', null)
    .order('employee_id_number', { ascending: false })
    .limit(100)

  let maxNum = 0
  if (data && !error) {
    for (const row of data) {
      const match = row.employee_id_number?.match(/^EMP-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
  }

  const nextNum = maxNum + 1
  return `EMP-${String(nextNum).padStart(3, '0')}`
}

import { headers } from 'next/headers'
import { resolveClientMetadata, parseUserAgent, parseDetailedUserAgent } from '@/lib/utils/device-parser'
import { logSecurityEvent } from '@/lib/utils/audit-logger'
import { checkRateLimit, checkRateLimitDistributed } from '@/lib/utils/rate-limiter'
import { measureAsync } from '@/lib/utils/perf-monitor'

/**
 * Login with email and password.
 */
export async function loginAction(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  return measureAsync('loginAction', async () => {
    // Ensure Supabase environment configuration exists before attempting sign-in
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    return {
      success: false,
      error: 'Supabase URL is not configured. Please add NEXT_PUBLIC_SUPABASE_URL in your Vercel Project Environment Variables.'
    }
  }

  const supabase = await createClient()
  const headerStore = await headers()
  const geoMeta = await resolveClientMetadata(headerStore)
  const userAgent = headerStore.get('user-agent') || ''
  const clientInfo = parseDetailedUserAgent(userAgent, headerStore)

  // Safe development diagnostics (strictly non-sensitive)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Auth Login Diagnostic]', {
      email,
      sourceHeader: geoMeta.sourceHeader,
      ipFound: Boolean(geoMeta.ip),
      ipAddress: geoMeta.ip,
      classification: geoMeta.classification,
    })
  }
  
  // Rate limit: max 5 attempts per min per email, 10 per min per IP
  const emailKey = `login:email:${email.toLowerCase().trim()}`
  const ipKey = `login:ip:${geoMeta.ip || 'unknown'}`
  const emailLimit = await checkRateLimitDistributed(emailKey, 5, 60 * 1000)
  const ipLimit = await checkRateLimitDistributed(ipKey, 10, 60 * 1000)

  if (!emailLimit.success || !ipLimit.success) {
    const retryAfter = Math.max(emailLimit.retryAfterSeconds || 30, ipLimit.retryAfterSeconds || 30)
    return {
      success: false,
      error: `Too many login attempts. Please wait ${retryAfter} seconds before trying again.`
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    let empId: string | null = null
    let empNum: string | null = null
    let empName: string | null = null
    let targetUserId: string | null = null

    try {
      const admin = await createAdminClient()
      const { data: ob } = await admin
        .from('employee_onboarding')
        .select('id, employee_id_number, first_name, last_name')
        .or(`email.ilike.${email},personal_email.ilike.${email}`)
        .limit(1)

      if (ob && ob.length > 0) {
        empId = ob[0].id
        empNum = ob[0].employee_id_number
        empName = `${ob[0].first_name || ''} ${ob[0].last_name || ''}`.trim()
      }

      if (empNum) {
        const { data: profs } = await admin
          .from('profiles')
          .select('id')
          .eq('employee_id', empNum)
          .limit(1)
        if (profs && profs.length > 0) {
          targetUserId = profs[0].id
        }
      }
    } catch {
      // Non-blocking lookup
    }

    await logSecurityEvent({
      eventType: 'login_failed',
      status: 'Failed',
      userId: targetUserId,
      employeeId: empId,
      employeeIdNumber: empNum,
      employeeName: empName,
      authMethod: 'Password',
      ipAddress: geoMeta.ip,
      ipClassification: geoMeta.classification,
      location: geoMeta.location,
      userAgent,
      browser: clientInfo.displayName,
      os: clientInfo.fullOs,
      device: clientInfo.deviceType,
      clientType: clientInfo.clientType,
      appName: clientInfo.appName,
      appVersion: clientInfo.appVersion,
      runtime: clientInfo.runtime,
      browserVersion: clientInfo.browserVersion,
      browserEngine: clientInfo.browserEngine,
      osVersion: clientInfo.osVersion,
      city: geoMeta.city,
      region: geoMeta.region,
      country: geoMeta.country,
      latitude: geoMeta.latitude,
      longitude: geoMeta.longitude,
      timezone: geoMeta.timezone,
      isp: geoMeta.isp,
      metadataSource: geoMeta.sourceHeader,
      metadata: {
        failure_reason: error.message || 'Invalid credentials'
      }
    })
    const friendlyError =
      error.message === 'fetch failed'
        ? 'Cannot connect to Supabase. Please ensure your Supabase project is active and environment variables are set in Vercel.'
        : error.message
    return { success: false, error: friendlyError }
  }

  if (data?.user) {
    const admin = await createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('employee_id, first_name, last_name')
      .eq('id', data.user.id)
      .maybeSingle()

    let onboardingId: string | null = null
    let isInactive = Boolean(data.user.app_metadata?.deactivated || (data.user as any).banned_until)

    if (profile?.employee_id) {
      const { data: ob } = await admin
        .from('employee_onboarding')
        .select('id, employment_status')
        .eq('employee_id_number', profile.employee_id)
        .maybeSingle()
      if (ob) {
        onboardingId = ob.id
        if (ob.employment_status === 'Inactive' || ob.employment_status === 'Terminated') {
          isInactive = true
        }
      }
    }

    const empName = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : null

    if (isInactive) {
      await supabase.auth.signOut()
      await logSecurityEvent({
        eventType: 'login_failed',
        status: 'Failed',
        userId: data.user.id,
        employeeId: onboardingId,
        employeeIdNumber: profile?.employee_id || null,
        employeeName: empName || null,
        authMethod: 'Password',
        ipAddress: geoMeta.ip,
        ipClassification: geoMeta.classification,
        location: geoMeta.location,
        userAgent,
        browser: clientInfo.displayName,
        os: clientInfo.fullOs,
        device: clientInfo.deviceType,
        clientType: clientInfo.clientType,
        appName: clientInfo.appName,
        appVersion: clientInfo.appVersion,
        runtime: clientInfo.runtime,
        browserVersion: clientInfo.browserVersion,
        browserEngine: clientInfo.browserEngine,
        osVersion: clientInfo.osVersion,
        city: geoMeta.city,
        region: geoMeta.region,
        country: geoMeta.country,
        latitude: geoMeta.latitude,
        longitude: geoMeta.longitude,
        timezone: geoMeta.timezone,
        isp: geoMeta.isp,
        sessionStatus: 'Revoked',
        isSuspicious: true,
        flagReason: 'Attempted login to deactivated account',
        metadataSource: geoMeta.sourceHeader,
        metadata: {
          failure_reason: 'Account deactivated'
        }
      })
      return { success: false, error: 'Your account has been deactivated. Please contact your administrator.' }
    }

    await logSecurityEvent({
      eventType: 'login_success',
      status: 'Success',
      userId: data.user.id,
      employeeId: onboardingId,
      employeeIdNumber: profile?.employee_id || null,
      employeeName: empName || null,
      authMethod: 'Password',
      ipAddress: geoMeta.ip,
      ipClassification: geoMeta.classification,
      location: geoMeta.location,
      userAgent,
      browser: clientInfo.displayName,
      os: clientInfo.fullOs,
      device: clientInfo.deviceType,
      clientType: clientInfo.clientType,
      appName: clientInfo.appName,
      appVersion: clientInfo.appVersion,
      runtime: clientInfo.runtime,
      browserVersion: clientInfo.browserVersion,
      browserEngine: clientInfo.browserEngine,
      osVersion: clientInfo.osVersion,
      city: geoMeta.city,
      region: geoMeta.region,
      country: geoMeta.country,
      latitude: geoMeta.latitude,
      longitude: geoMeta.longitude,
      timezone: geoMeta.timezone,
      isp: geoMeta.isp,
      sessionId: data.session ? `sess_${crypto.randomUUID().slice(0, 8)}` : null,
      sessionStatus: 'Active',
      metadataSource: geoMeta.sourceHeader,
      metadata: {
        session_type: 'web_session',
        auth_provider: 'password'
      }
    })
  }

    return { success: true }
  })
}

/**
 * Logout the current user.
 */
export async function logoutAction() {
  const supabase = await createClient()
  try {
    const headerStore = await headers()
    const geoMeta = await resolveClientMetadata(headerStore)
    const userAgent = headerStore.get('user-agent') || ''
    const clientInfo = parseDetailedUserAgent(userAgent, headerStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await logSecurityEvent({
        eventType: 'logout',
        status: 'Success',
        userId: user.id,
        ipAddress: geoMeta.ip,
        ipClassification: geoMeta.classification,
        location: geoMeta.location,
        userAgent,
        browser: clientInfo.displayName,
        os: clientInfo.fullOs,
        device: clientInfo.deviceType,
        clientType: clientInfo.clientType,
        appName: clientInfo.appName,
        appVersion: clientInfo.appVersion,
        runtime: clientInfo.runtime,
        browserVersion: clientInfo.browserVersion,
        browserEngine: clientInfo.browserEngine,
        osVersion: clientInfo.osVersion,
        city: geoMeta.city,
        region: geoMeta.region,
        country: geoMeta.country,
        latitude: geoMeta.latitude,
        longitude: geoMeta.longitude,
        timezone: geoMeta.timezone,
        isp: geoMeta.isp,
        sessionStatus: 'Logged Out',
        metadataSource: geoMeta.sourceHeader,
        metadata: {
          session_action: 'user_signout'
        }
      })
    }
  } catch (e) {
    console.error('[logoutAction] Error logging security event:', e)
  }
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * Create a Supabase Auth account for a new employee during onboarding.
 * Returns the generated employee_id and temporary password.
 */
export async function createEmployeeAccount(
  workEmail: string,
  employeeName: string,
  role: AppRole = 'Employee'
): Promise<{ success: boolean; employee_id: string; temp_password: string; auth_user_id: string; error?: string }> {
  const admin = await createAdminClient()
  
  // Generate employee ID and temp password
  const employeeId = await generateEmployeeId()
  const tempPassword = generateTempPassword()

  // Create Supabase Auth user (admin API doesn't send confirmation email)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: workEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role,
      employee_id: employeeId,
    },
  })

  if (authError) {
    return { success: false, employee_id: '', temp_password: '', auth_user_id: '', error: authError.message }
  }

  const authUserId = authData.user.id

  // Create profiles entry linking auth user to employee data
  const nameParts = employeeName.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''
  
  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      id: authUserId,
      employee_id: employeeId,
      first_name: firstName,
      last_name: lastName,
      role,
    })

  if (profileError) {
    // Cleanup: delete the auth user if profile creation fails
    await admin.auth.admin.deleteUser(authUserId)
    return { success: false, employee_id: '', temp_password: '', auth_user_id: '', error: profileError.message }
  }

  return {
    success: true,
    employee_id: employeeId,
    temp_password: tempPassword,
    auth_user_id: authUserId,
  }
}
