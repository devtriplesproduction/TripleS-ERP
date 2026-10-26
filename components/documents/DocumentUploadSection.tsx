'use client'

import React, { useRef, useState } from 'react'
import {
  FileText,
  UploadCloud,
  Loader2,
  Plus,
  Eye,
  Download,
  Trash2,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

export interface DocumentItem {
  id?: string
  name: string
  url?: string
  path?: string
  size?: number | string
  type?: string
  created_at?: string
  uploaded_by?: {
    name?: string
    avatar?: string | null
    initials?: string
  } | string
  raw?: any
}

export interface DocumentUploadSectionProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  documents: DocumentItem[]
  onUpload: (files: File[]) => Promise<void> | void
  onDelete?: (document: DocumentItem, index: number) => Promise<void> | void
  onView?: (document: DocumentItem, index: number) => Promise<void> | void
  onDownload?: (document: DocumentItem, index: number) => Promise<void> | void
  isUploading?: boolean
  isLoading?: boolean
  accept?: string
  maxSizeBytes?: number
  maxSizeLabel?: string
  canUpload?: boolean
  canDelete?: boolean
  showUploadButtonInHeader?: boolean
  emptyStateTitle?: string
  emptyStateDescription?: string
  uploadButtonText?: string
  className?: string
  gridClassName?: string
}

function formatBytes(bytes: number | string | undefined, decimals = 1): string {
  if (bytes === undefined || bytes === null || bytes === '') return ''
  if (typeof bytes === 'string') {
    if (/[a-zA-Z]/.test(bytes)) return bytes
    bytes = Number(bytes)
  }
  if (!+bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getFileIcon(fileName: string, mimeType?: string) {
  const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : ''
  const mime = (mimeType || '').toLowerCase()

  if (mime.includes('image') || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) {
    return <FileImage className="w-4 h-4 text-blue-500" />
  }
  if (mime.includes('pdf') || ext === '.pdf') {
    return <FileText className="w-4 h-4 text-red-500" />
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('csv') ||
    mime.includes('excel') ||
    ['.xls', '.xlsx', '.csv'].includes(ext)
  ) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
  }
  if (mime.includes('zip') || mime.includes('tar') || ['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-500" />
  }
  if (['.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.sql'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-purple-500" />
  }
  return <FileIcon className="w-4 h-4 text-muted-foreground" />
}

export function DocumentUploadSection({
  title = 'Uploaded Documents',
  description = 'Files and documents related to this record.',
  icon,
  documents = [],
  onUpload,
  onDelete,
  onView,
  onDownload,
  isUploading = false,
  isLoading = false,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip',
  maxSizeBytes = 10 * 1024 * 1024,
  maxSizeLabel = '10MB',
  canUpload = true,
  canDelete = true,
  showUploadButtonInHeader = true,
  emptyStateTitle,
  emptyStateDescription,
  uploadButtonText = 'Upload',
  className,
  gridClassName,
}: DocumentUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleFiles = (files: File[]) => {
    if (!canUpload || isUploading) return

    const validFiles: File[] = []
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1']

    for (const file of files) {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (dangerousExtensions.includes(ext)) {
        toast.error(`"${file.name}" cannot be uploaded because executable files are not allowed.`)
        continue
      }
      if (maxSizeBytes && file.size > maxSizeBytes) {
        toast.error(`"${file.name}" exceeds the ${maxSizeLabel} file size limit.`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onUpload(validFiles)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canUpload || isUploading) return
    dragCounter.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      setIsDragging(false)
      dragCounter.current = 0
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canUpload || isUploading) return
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    if (!canUpload || isUploading) return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files))
      e.dataTransfer.clearData()
    }
  }

  const openPicker = () => {
    if (canUpload && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted/50 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800/80 text-foreground flex items-center justify-center shrink-0">
            {icon || <FileText className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground tracking-tight">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>

        {canUpload && (
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept={accept}
            className="hidden"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
        )}

        {canUpload && showUploadButtonInHeader && (
          <div>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 px-4 text-xs font-semibold gap-1.5 shadow-xs"
              onClick={openPicker}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {isUploading ? 'Uploading...' : uploadButtonText}
            </Button>
          </div>
        )}
      </div>

      {/* Main Drag-and-Drop Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative bg-card/30 border rounded-2xl p-5 transition-all duration-200',
          isDragging
            ? 'border-foreground/80 dark:border-zinc-300 bg-muted/30 dark:bg-zinc-900/60 ring-2 ring-foreground/20'
            : 'border-border/40'
        )}
      >
        {/* Active Drop Backdrop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 dark:bg-zinc-950/90 backdrop-blur-xs rounded-2xl border-2 border-dashed border-foreground/80 dark:border-zinc-300 pointer-events-none animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-2xl bg-muted dark:bg-zinc-900 border border-border/50 dark:border-zinc-700 text-foreground flex items-center justify-center mb-3 scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-base font-semibold text-foreground">Drop files here to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Up to {maxSizeLabel} per file</p>
          </div>
        )}

        {/* Loading Spinner during initial fetch */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-xs text-muted-foreground font-medium">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          /* Empty State / Interactive Drag & Drop Box */
          <div
            onClick={openPicker}
            className={cn(
              'cursor-pointer text-center py-14 px-6 border-2 border-dashed rounded-xl transition-all duration-200 group select-none',
              isDragging
                ? 'border-foreground/80 dark:border-zinc-300 bg-muted/40 dark:bg-zinc-900/60'
                : 'border-border/60 bg-muted/10 dark:bg-zinc-950/40 hover:border-foreground/60 hover:bg-muted/20'
            )}
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-foreground mb-3" />
                <p className="font-semibold text-foreground text-sm">Uploading document(s)...</p>
                <p className="text-xs text-muted-foreground mt-1">Please wait while files are being securely stored</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800 text-foreground flex items-center justify-center mb-3 group-hover:scale-105 group-hover:border-foreground/40 transition-all">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="font-semibold text-base text-foreground mb-1">
                  {emptyStateTitle || (
                    <>
                      Drag &amp; drop documents here, or{' '}
                      <span className="text-foreground underline underline-offset-4 decoration-muted-foreground/60 hover:decoration-foreground font-semibold transition-colors">
                        browse
                      </span>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground max-w-md">
                  {emptyStateDescription || `Supported formats: PDF, DOCX, XLSX, PNG, JPG, ZIP (Max ${maxSizeLabel} per file)`}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Populated State */
          <div className="space-y-4">
            {/* Compact Drag & Drop Strip above existing files */}
            {canUpload && (
              <div
                onClick={openPicker}
                className={cn(
                  'cursor-pointer border-2 border-dashed rounded-xl p-3.5 flex items-center justify-center gap-3 transition-all duration-200 group select-none',
                  isDragging
                    ? 'border-foreground/80 dark:border-zinc-300 bg-muted/40 dark:bg-zinc-900/60'
                    : 'border-border/60 bg-muted/10 dark:bg-zinc-950/40 hover:border-foreground/60 hover:bg-muted/20'
                )}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2 py-0.5">
                    <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                    <span className="text-xs font-medium text-foreground">Uploading document(s)...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-muted/60 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800 text-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-foreground">Drag &amp; drop more documents here</span>
                      <span className="text-muted-foreground">
                        , or{' '}
                        <span className="text-foreground underline underline-offset-2 decoration-muted-foreground/60 hover:decoration-foreground font-medium transition-colors">
                          browse files
                        </span>{' '}
                        (up to {maxSizeLabel})
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Existing Documents Grid */}
            <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3', gridClassName)}>
              {documents.map((doc, idx) => {
                const displayName = doc.name || (typeof doc === 'string' ? doc : 'Document')
                const extMatch = displayName.lastIndexOf('.') !== -1 ? displayName.substring(displayName.lastIndexOf('.') + 1).toUpperCase() : ''
                const cleanName = displayName.includes('.') ? displayName.substring(0, displayName.lastIndexOf('.')) : displayName
                const formattedSize = formatBytes(doc.size)
                const formattedDate = (() => {
                  if (!doc.created_at) return null
                  try {
                    const d = new Date(doc.created_at)
                    return isNaN(d.getTime()) ? null : format(d, 'MMM dd, yyyy')
                  } catch {
                    return null
                  }
                })()

                const uploaderName =
                  typeof doc.uploaded_by === 'object' && doc.uploaded_by?.name
                    ? doc.uploaded_by.name
                    : typeof doc.uploaded_by === 'string'
                    ? doc.uploaded_by
                    : null

                const uploaderAvatar =
                  typeof doc.uploaded_by === 'object' && doc.uploaded_by?.avatar ? doc.uploaded_by.avatar : null

                return (
                  <div
                    key={doc.id || idx}
                    className="flex items-center justify-between p-3.5 border border-border/40 rounded-xl bg-card/60 hover:bg-card transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1 mr-2">
                      <div className="w-9 h-9 rounded-lg bg-muted/60 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800 text-foreground flex items-center justify-center shrink-0">
                        {getFileIcon(displayName, doc.type)}
                      </div>
                      <div className="overflow-hidden min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors"
                            title={displayName}
                          >
                            {cleanName}
                          </span>
                          {extMatch && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 bg-muted/40 font-mono shrink-0 font-medium"
                            >
                              {extMatch}
                            </Badge>
                          )}
                        </div>

                        {/* Metadata subline: size, date, uploader */}
                        {(formattedSize || formattedDate || uploaderName) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                            {formattedSize && <span>{formattedSize}</span>}
                            {formattedSize && formattedDate && <span className="opacity-60">•</span>}
                            {formattedDate && <span>{formattedDate}</span>}
                            {uploaderName && (
                              <>
                                {(formattedSize || formattedDate) && <span className="opacity-60">•</span>}
                                <div className="inline-flex items-center gap-1 max-w-[120px] truncate">
                                  {uploaderAvatar && (
                                    <Avatar className="h-3.5 w-3.5 shrink-0 border border-border/40">
                                      <AvatarImage src={uploaderAvatar} />
                                      <AvatarFallback className="text-[7px]">
                                        {uploaderName.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <span className="truncate">{uploaderName}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onView && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onView(doc, idx)
                          }}
                          title="View / Preview Document"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}

                      {onDownload && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDownload(doc, idx)
                          }}
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}

                      {canDelete && onDelete && (
                        <ConfirmModal
                          title="Delete Document"
                          description="Are you sure you want to delete this document? This action cannot be undone."
                          onConfirm={() => onDelete(doc, idx)}
                          confirmText="Delete"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete Document"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </ConfirmModal>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
