'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getProjectFilesAction,
  uploadProjectFileAction,
  deleteProjectFileAction,
  getProjectFileDownloadUrlAction,
  ProjectFileMetadata,
} from '@/lib/actions/project-files'
import { DocumentUploadSection, DocumentItem } from '@/components/documents/DocumentUploadSection'
import { Folder } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectFilesTabProps {
  projectId: string
  canUpload?: boolean
  canDelete?: boolean
}

export function ProjectFilesTab({
  projectId,
  canUpload = true,
  canDelete = true,
}: ProjectFilesTabProps) {
  const [files, setFiles] = useState<ProjectFileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetchFiles = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await getProjectFilesAction(projectId)
      if (res.success && res.data) {
        setFiles(res.data)
      } else {
        if (res.error?.includes('project_files table has not been created') || res.error?.includes('does not exist')) {
          setFiles([])
        } else {
          toast.error(res.error || 'Failed to fetch project files')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading project files')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleUploadFiles = async (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0 || uploading) return

    setUploading(true)
    const newlyAdded: ProjectFileMetadata[] = []

    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await uploadProjectFileAction(projectId, formData)
        if (res.success && res.data) {
          newlyAdded.push(res.data)
        } else {
          toast.error(res.error || `Failed to upload "${file.name}"`)
        }
      }

      if (newlyAdded.length > 0) {
        // Optimistically update the files list so user sees them immediately
        setFiles((prev) => [
          ...newlyAdded,
          ...prev.filter((p) => !newlyAdded.some((n) => n.id === p.id)),
        ])

        toast.success(
          newlyAdded.length > 1
            ? `${newlyAdded.length} files uploaded successfully`
            : 'File uploaded successfully'
        )

        // Sync with server in background
        fetchFiles()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete file upload')
    } finally {
      setUploading(false)
    }
  }

  const handleViewFile = async (doc: DocumentItem) => {
    if (!doc.path) {
      toast.error('File storage path missing')
      return
    }

    const res = await getProjectFileDownloadUrlAction(doc.path, projectId)
    if (res.success && res.data) {
      window.open(res.data, '_blank', 'noopener,noreferrer')
    } else {
      toast.error(res.error || 'Failed to preview file')
    }
  }

  const handleDownloadFile = async (doc: DocumentItem) => {
    if (!doc.path) {
      toast.error('File storage path missing')
      return
    }

    const res = await getProjectFileDownloadUrlAction(doc.path, projectId)
    if (res.success && res.data) {
      const a = document.createElement('a')
      a.href = res.data
      a.download = doc.name
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      toast.error(res.error || 'Failed to download file')
    }
  }

  const handleDeleteFile = async (doc: DocumentItem) => {
    if (!doc.id || !doc.path) {
      toast.error('File details missing')
      return
    }

    const res = await deleteProjectFileAction(doc.id, doc.path, projectId)
    if (res.success) {
      setFiles((prev) => prev.filter((f) => f.id !== doc.id))
      toast.success('File deleted successfully')
    } else {
      toast.error(res.error || 'Failed to delete file')
    }
  }

  const documentItems: DocumentItem[] = files.map((f) => {
    const uploaderName = f.profile
      ? `${f.profile.first_name} ${f.profile.last_name || ''}`.trim()
      : undefined

    return {
      id: f.id,
      name: f.file_name,
      size: f.file_size,
      type: f.mime_type,
      created_at: f.created_at,
      path: f.storage_path,
      uploaded_by: uploaderName
        ? {
            name: uploaderName,
            avatar: f.profile?.profile_photo || null,
          }
        : undefined,
      raw: f,
    }
  })

  return (
    <DocumentUploadSection
      title="Project Files"
      description="Documents, assets, and deliverables associated with this project."
      icon={<Folder className="w-5 h-5 text-foreground" />}
      documents={documentItems}
      onUpload={handleUploadFiles}
      onView={handleViewFile}
      onDownload={handleDownloadFile}
      onDelete={handleDeleteFile}
      isUploading={uploading}
      isLoading={loading}
      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip"
      maxSizeBytes={50 * 1024 * 1024}
      maxSizeLabel="50MB"
      canUpload={canUpload}
      canDelete={canDelete}
      uploadButtonText="Upload File"
      emptyStateTitle="No files uploaded yet"
      emptyStateDescription="Upload project requirements, design assets, or final deliverables here. Files will be accessible to all team members."
    />
  )
}
