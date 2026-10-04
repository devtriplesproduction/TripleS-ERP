'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canManageClients, canViewRestrictedClientInfo } from '@/lib/permissions/project-management'
import { Client, ClientStatus } from '@/types/project-management'
import { revalidatePath } from 'next/cache'

export interface CreateClientInput {
  name: string
  location: string
  contact_number?: string | null
  whatsapp_number?: string | null
  email?: string | null
  status?: ClientStatus
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: string
}

/**
 * Generate sequential Client ID (CLI-001, CLI-002, etc.)
 */
async function generateClientId(): Promise<string> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('clients')
    .select('client_id_display')
    .order('created_at', { ascending: false })
    .limit(100)

  let maxNum = 0
  if (data) {
    for (const row of data) {
      const match = row.client_id_display?.match(/^CLI-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
  }

  return `CLI-${String(maxNum + 1).padStart(3, '0')}`
}

/**
 * Fetch all clients with strict server-side authorization:
 * - Admin/Manager: receives all fields including contact_number, whatsapp_number, email.
 * - HOD/Employee: server query strictly selects ONLY id, client_id_display, name, location, status, created_at, updated_at.
 *   Restricted contact fields are NEVER retrieved from database or exposed in memory/response.
 */
export async function getClients(): Promise<{ success: boolean; data: Client[]; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, data: [], error: 'Authentication required' }
    }

    const admin = await createAdminClient()
    const canSeeContact = canViewRestrictedClientInfo(user)

    // Strict column-level selection enforced on server
    const queryColumns = canSeeContact
      ? 'id, client_id_display, name, location, contact_number, whatsapp_number, email, status, created_by, created_at, updated_at'
      : 'id, client_id_display, name, location, status, created_by, created_at, updated_at'

    const { data, error } = await admin
      .from('clients')
      .select(queryColumns)
      .order('created_at', { ascending: false })

    if (error) {
      // Graceful fallback if table is not yet created in Supabase SQL editor
      if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
        return { success: true, data: [] }
      }
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: (data || []) as unknown as Client[] }
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Failed to fetch clients' }
  }
}

/**
 * Fetch a single client by ID with role-based field sanitization.
 */
export async function getClientById(id: string): Promise<{ success: boolean; data: Client | null; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, data: null, error: 'Authentication required' }
    }

    const admin = await createAdminClient()
    const canSeeContact = canViewRestrictedClientInfo(user)

    const queryColumns = canSeeContact
      ? 'id, client_id_display, name, location, contact_number, whatsapp_number, email, status, created_by, created_at, updated_at'
      : 'id, client_id_display, name, location, status, created_by, created_at, updated_at'

    const { data, error } = await admin
      .from('clients')
      .select(queryColumns)
      .eq('id', id)
      .single()

    if (error) {
      return { success: false, data: null, error: error.message }
    }

    return { success: true, data: (data as unknown) as Client }
  } catch (err: any) {
    return { success: false, data: null, error: err.message || 'Failed to fetch client' }
  }
}

/**
 * Create a new Client.
 * Restricted to Admin and Manager only.
 * Validates inputs, trims whitespace, and prevents duplicate clients.
 */
export async function createClientAction(input: CreateClientInput): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!canManageClients(user)) {
      return { success: false, error: 'Unauthorized: Only Admin and Manager can create clients.' }
    }

    const name = input.name?.trim()
    const location = input.location?.trim()
    const contact = input.contact_number?.trim() || null
    const whatsapp = input.whatsapp_number?.trim() || null
    const email = input.email?.trim() || null

    if (!name) {
      return { success: false, error: 'Client Name is required.' }
    }

    if (!location) {
      return { success: false, error: 'Location is required.' }
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Invalid email address format.' }
    }

    if (contact && !/^[+0-9\s\-()]{7,20}$/.test(contact)) {
      return { success: false, error: 'Invalid contact number format.' }
    }

    if (whatsapp && !/^[+0-9\s\-()]{7,20}$/.test(whatsapp)) {
      return { success: false, error: 'Invalid WhatsApp number format.' }
    }

    const admin = await createAdminClient()

    // Check for duplicate active client
    const { data: existing } = await admin
      .from('clients')
      .select('id, name')
      .ilike('name', name)
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: `A client with the name "${name}" already exists.` }
    }

    const clientIdDisplay = await generateClientId()

    const { data: inserted, error: insertError } = await admin
      .from('clients')
      .insert({
        client_id_display: clientIdDisplay,
        name,
        location,
        contact_number: contact,
        whatsapp_number: whatsapp,
        email,
        status: input.status || 'Active',
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    revalidatePath('/clients')
    revalidatePath('/projects')
    return { success: true, data: inserted as Client }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create client' }
  }
}

/**
 * Update an existing Client.
 * Restricted to Admin and Manager only.
 */
export async function updateClientAction(input: UpdateClientInput): Promise<{ success: boolean; data?: Client; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!canManageClients(user)) {
      return { success: false, error: 'Unauthorized: Only Admin and Manager can update clients.' }
    }

    const updatePayload: Record<string, any> = {}

    if (input.name !== undefined) {
      const trimmed = input.name.trim()
      if (!trimmed) return { success: false, error: 'Client Name cannot be empty.' }
      updatePayload.name = trimmed
    }

    if (input.location !== undefined) {
      const trimmed = input.location.trim()
      if (!trimmed) return { success: false, error: 'Location cannot be empty.' }
      updatePayload.location = trimmed
    }

    if (input.contact_number !== undefined) {
      const trimmed = input.contact_number?.trim() || null
      if (trimmed && !/^[+0-9\s\-()]{7,20}$/.test(trimmed)) {
        return { success: false, error: 'Invalid contact number format.' }
      }
      updatePayload.contact_number = trimmed
    }

    if (input.whatsapp_number !== undefined) {
      const trimmed = input.whatsapp_number?.trim() || null
      if (trimmed && !/^[+0-9\s\-()]{7,20}$/.test(trimmed)) {
        return { success: false, error: 'Invalid WhatsApp number format.' }
      }
      updatePayload.whatsapp_number = trimmed
    }

    if (input.email !== undefined) {
      const trimmed = input.email?.trim() || null
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return { success: false, error: 'Invalid email address format.' }
      }
      updatePayload.email = trimmed
    }

    if (input.status !== undefined) {
      updatePayload.status = input.status
    }

    const admin = await createAdminClient()
    const { data: updated, error } = await admin
      .from('clients')
      .update(updatePayload)
      .eq('id', input.id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/clients')
    revalidatePath('/projects')
    return { success: true, data: updated as Client }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update client' }
  }
}
