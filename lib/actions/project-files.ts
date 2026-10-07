'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface ProjectFileMetadata {
  id: string
  project_id: string
  uploaded_by: string
  file_name: string
  storage_path: string
  file_size: number
  mime_type: string
  created_at: string
  updated_at: string
  profile?: {
    first_name: string
    last_name: string | null
    profile_photo?: string | null
  }
}

export async function uploadProjectFileAction(projectId: string, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }

    // Validate size (e.g. max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'File size exceeds 50MB limit' }
    }

    // Validate type (block executables)
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1']
    const fileName = file.name
    const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    
    if (dangerousExtensions.includes(fileExt)) {
      return { success: false, error: 'Executable files are not allowed' }
    }

    const admin = await createAdminClient()

    // Create bucket if it doesn't exist
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'project-files')) {
      await admin.storage.createBucket('project-files', { public: false })
    }

    const uniqueId = crypto.randomUUID()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const storagePath = `${projectId}/${uniqueId}-${sanitizedName}`

    const { error: uploadError } = await admin.storage
      .from('project-files')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    // Insert metadata
    const { data: inserted, error: insertError } = await admin
      .from('project_files')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_name: fileName,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single()

    if (insertError) {
      // Rollback storage
      await admin.storage.from('project-files').remove([storagePath])
      
      // If table doesn't exist, provide a clear error message
      if (insertError.code === 'PGRST205' || insertError.message.includes('does not exist')) {
         return { success: false, error: 'The project_files table has not been created in the database. Please run the provided SQL migration.' }
      }
      return { success: false, error: insertError.message }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true, data: inserted }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload project file' }
  }
}

export async function getProjectFilesAction(projectId: string): Promise<{ success: boolean; data?: ProjectFileMetadata[]; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const admin = await createAdminClient()

    // Authorization check
    const isGlobalAdminOrManager = user.role === 'Admin' || user.is_hod
    let isAuthorized = isGlobalAdminOrManager
    
    if (!isAuthorized) {
      const { data: pCheck } = await admin.from('projects').select('project_manager_id').eq('id', projectId).single()
      if (pCheck?.project_manager_id === user.id) {
        isAuthorized = true
      } else {
        const { data: mCheck } = await admin.from('project_members').select('id').eq('project_id', projectId).eq('user_id', user.id)
        if (mCheck && mCheck.length > 0) {
          isAuthorized = true
        } else {
          const { data: tCheck } = await admin.from('tasks').select('id').eq('project_id', projectId)
          if (tCheck && tCheck.length > 0) {
            const taskIds = tCheck.map((t: any) => t.id)
            const { data: taCheck } = await admin.from('task_assignees').select('id').in('task_id', taskIds).eq('user_id', user.id).limit(1)
            if (taCheck && taCheck.length > 0) {
              isAuthorized = true
            }
          }
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized to view these files' }
    }

    const { data, error } = await admin
      .from('project_files')
      .select(`
        *,
        profile:profiles!project_files_uploaded_by_fkey(first_name, last_name, profile_photo)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST205') return { success: true, data: [] }
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch project files' }
  }
}

export async function deleteProjectFileAction(fileId: string, storagePath: string, projectId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const admin = await createAdminClient()

    // Authorization: only Admin, HOD, or Project Manager can delete, or the uploader.
    let canDelete = user.role === 'Admin' || user.is_hod
    
    if (!canDelete) {
      const { data: pCheck } = await admin.from('projects').select('project_manager_id').eq('id', projectId).single()
      if (pCheck?.project_manager_id === user.id) {
        canDelete = true
      } else {
        const { data: fCheck } = await admin.from('project_files').select('uploaded_by').eq('id', fileId).single()
        if (fCheck?.uploaded_by === user.id) {
          canDelete = true
        }
      }
    }

    if (!canDelete) {
      return { success: false, error: 'Unauthorized to delete this file' }
    }

    // Delete from storage first
    const { error: storageError } = await admin.storage.from('project-files').remove([storagePath])
    if (storageError) {
      return { success: false, error: `Failed to remove from storage: ${storageError.message}` }
    }

    // Delete metadata
    const { error: dbError } = await admin.from('project_files').delete().eq('id', fileId)
    if (dbError) {
      return { success: false, error: `Storage removed but metadata deletion failed: ${dbError.message}` }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete file' }
  }
}

export async function getProjectFileDownloadUrlAction(storagePath: string, projectId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Authentication required' }

    const admin = await createAdminClient()

    // Authorization check
    const isGlobalAdminOrManager = user.role === 'Admin' || user.is_hod
    let isAuthorized = isGlobalAdminOrManager
    
    if (!isAuthorized) {
      const { data: pCheck } = await admin.from('projects').select('project_manager_id').eq('id', projectId).single()
      if (pCheck?.project_manager_id === user.id) {
        isAuthorized = true
      } else {
        const { data: mCheck } = await admin.from('project_members').select('id').eq('project_id', projectId).eq('user_id', user.id)
        if (mCheck && mCheck.length > 0) {
          isAuthorized = true
        } else {
          const { data: tCheck } = await admin.from('tasks').select('id').eq('project_id', projectId)
          if (tCheck && tCheck.length > 0) {
            const taskIds = tCheck.map((t: any) => t.id)
            const { data: taCheck } = await admin.from('task_assignees').select('id').in('task_id', taskIds).eq('user_id', user.id).limit(1)
            if (taCheck && taCheck.length > 0) {
              isAuthorized = true
            }
          }
        }
      }
    }

    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized to download this file' }
    }

    // 60-second signed URL
    const { data, error } = await admin.storage.from('project-files').createSignedUrl(storagePath, 60)
    
    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to generate download URL' }
    }

    return { success: true, data: data.signedUrl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to get download URL' }
  }
}
