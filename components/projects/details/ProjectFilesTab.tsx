'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Download, UploadCloud, Trash2, Loader2, File as FileIcon, FileImage, FileArchive, FileSpreadsheet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProjectFilesAction, uploadProjectFileAction, deleteProjectFileAction, getProjectFileDownloadUrlAction, ProjectFileMetadata } from '@/lib/actions/project-files'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface ProjectFilesTabProps {
  projectId: string
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-600" />
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive className="h-5 w-5 text-orange-500" />
  return <FileIcon className="h-5 w-5 text-muted-foreground" />
}

export function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  const [files, setFiles] = useState<ProjectFileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = async () => {
    setLoading(true)
    const res = await getProjectFilesAction(projectId)
    if (res.success && res.data) {
      setFiles(res.data)
    } else {
      if (res.error?.includes('not been created in the database')) {
         // Gracefully handle missing table
         setFiles([])
      } else {
         toast.error(res.error || 'Failed to fetch project files')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFiles()
  }, [projectId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    const res = await uploadProjectFileAction(projectId, formData)
    
    if (res.success) {
      toast.success('File uploaded successfully')
      setUploadModalOpen(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchFiles()
    } else {
      toast.error(res.error || 'Failed to upload file')
    }
    setUploading(false)
  }

  const handleDownload = async (storagePath: string, fileName: string) => {
    const res = await getProjectFileDownloadUrlAction(storagePath, projectId)
    if (res.success && res.data) {
      const a = document.createElement('a')
      a.href = res.data
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      toast.error(res.error || 'Failed to download file')
    }
  }

  const handleDelete = async (fileId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return
    const res = await deleteProjectFileAction(fileId, storagePath, projectId)
    if (res.success) {
      toast.success('File deleted successfully')
      fetchFiles()
    } else {
      toast.error(res.error || 'Failed to delete file')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Project Files</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Documents, assets, and deliverables associated with this project.
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)} className="h-9 bg-primary text-primary-foreground font-medium text-xs px-4">
          <UploadCloud className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="font-semibold text-foreground">No files uploaded yet</h4>
            <p className="text-sm text-muted-foreground max-w-sm">
              Upload project requirements, design assets, or final deliverables here. Files will be accessible to all team members.
            </p>
            <Button onClick={() => setUploadModalOpen(true)} variant="outline" className="mt-2 text-xs">
              Browse Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          {files.map((f, i) => {
            const fileExt = f.file_name.substring(f.file_name.lastIndexOf('.') + 1).toUpperCase()
            const uploaderName = f.profile ? `${f.profile.first_name} ${f.profile.last_name || ''}`.trim() : 'Unknown'
            
            return (
              <div key={f.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 ${i !== files.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}>
                <div className="flex items-start sm:items-center gap-3">
                  <div className="mt-1 sm:mt-0">
                    {getFileIcon(f.mime_type)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                      {f.file_name}
                    </span>
                    <div className="flex items-center text-xs text-muted-foreground gap-2 mt-0.5">
                      <span>{fileExt}</span>
                      <span>&bull;</span>
                      <span>{formatBytes(f.file_size)}</span>
                      <span>&bull;</span>
                      <span>{format(new Date(f.created_at), 'dd MMM yyyy')}</span>
                      <span>&bull;</span>
                      <span className="truncate max-w-[120px]">By {uploaderName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(f.storage_path, f.file_name)} className="h-8 text-xs font-medium px-2">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id, f.storage_path)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={uploadModalOpen} onOpenChange={(open) => {
        if (!uploading) {
          setUploadModalOpen(open)
          if (!open) {
            setSelectedFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Project File</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${selectedFile ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40'}`}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip"
              />
              
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-sm truncate max-w-full px-4">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</span>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    disabled={uploading}
                  >
                    <X className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">Click to browse or drag & drop</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX, PNG, JPG, ZIP (Max 50MB)</p>
                  <Button variant="secondary" size="sm" className="mt-4 text-xs h-8">
                    Browse Files
                  </Button>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setUploadModalOpen(false)}
              disabled={uploading}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="text-xs h-9"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : 'Upload File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
