'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  UploadCloud,
  Loader2,
  X,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { DocumentItem } from '@/components/documents/DocumentUploadSection'

export interface EditDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  document: DocumentItem | null
  index: number | null
  onSave: (index: number, data: { name: string; file?: File }) => Promise<void> | void
  isSaving?: boolean
  maxSizeBytes?: number
  maxSizeLabel?: string
  accept?: string
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
    return <FileImage className="w-5 h-5 text-blue-500" />
  }
  if (mime.includes('pdf') || ext === '.pdf') {
    return <FileText className="w-5 h-5 text-red-500" />
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('csv') ||
    mime.includes('excel') ||
    ['.xls', '.xlsx', '.csv'].includes(ext)
  ) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
  }
  if (mime.includes('zip') || mime.includes('tar') || ['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-500" />
  }
  if (['.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.sql'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-purple-500" />
  }
  return <FileIcon className="w-5 h-5 text-muted-foreground" />
}

export function EditDocumentModal({
  isOpen,
  onClose,
  document,
  index,
  onSave,
  isSaving = false,
  maxSizeBytes = 10 * 1024 * 1024,
  maxSizeLabel = '10MB',
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip',
}: EditDocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docName, setDocName] = useState('')
  const [replacementFile, setReplacementFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (document) {
      setDocName(document.name || '')
      setReplacementFile(null)
    }
  }, [document, isOpen])

  const handleFileChange = (file: File) => {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (dangerousExtensions.includes(ext)) {
      toast.error(`"${file.name}" cannot be uploaded because executable files are not allowed.`)
      return
    }

    if (maxSizeBytes && file.size > maxSizeBytes) {
      toast.error(`"${file.name}" exceeds the ${maxSizeLabel} file size limit.`)
      return
    }

    setReplacementFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0])
      e.target.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
      e.dataTransfer.clearData()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docName.trim()) {
      toast.error('Document name is required.')
      return
    }
    if (index === null || index === undefined) return

    await onSave(index, {
      name: docName.trim(),
      file: replacementFile || undefined,
    })
  }

  const currentDisplayName = document?.name || 'Document'
  const currentExt = currentDisplayName.includes('.')
    ? currentDisplayName.substring(currentDisplayName.lastIndexOf('.') + 1).toUpperCase()
    : ''
  const currentFormattedSize = formatBytes(document?.size)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onClose() }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg bg-card border-border text-foreground p-5 sm:p-6 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Edit Document
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update document name or replace the existing file.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {/* Current Document Summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20">
            <div className="w-10 h-10 rounded-lg bg-muted/60 dark:bg-zinc-900 border border-border/50 flex items-center justify-center shrink-0">
              {getFileIcon(currentDisplayName, document?.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold truncate text-foreground" title={currentDisplayName}>
                  {currentDisplayName}
                </span>
                {currentExt && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-muted/40 font-mono shrink-0">
                    {currentExt}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Current file{currentFormattedSize ? ` • ${currentFormattedSize}` : ''}
              </div>
            </div>
          </div>

          {/* Document Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-document-name" className="text-xs font-semibold text-foreground">
              Document Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-document-name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Enter document name"
              disabled={isSaving}
              className="bg-background text-sm"
              required
            />
          </div>

          {/* Replace File Field (Optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Replace File <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>

            <input
              type="file"
              ref={fileInputRef}
              accept={accept}
              className="hidden"
              onChange={handleInputChange}
              disabled={isSaving}
            />

            {replacementFile ? (
              /* Selected Replacement File preview */
              <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate text-foreground">
                      {replacementFile.name}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Replacement selected • {formatBytes(replacementFile.size)}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setReplacementFile(null)}
                  disabled={isSaving}
                  title="Remove replacement file"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              /* Dropzone / Pick replacement button */
              <div
                onClick={() => !isSaving && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(false)
                }}
                onDrop={handleDrop}
                className={cn(
                  'cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-all select-none',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border/60 bg-muted/10 hover:border-foreground/40 hover:bg-muted/20'
                )}
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 dark:bg-zinc-900 border border-border/50 text-muted-foreground flex items-center justify-center">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    Click to select new file or drag and drop
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Leave empty to keep existing file (Max {maxSizeLabel})
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !docName.trim()}
              className="bg-foreground text-background text-xs font-semibold gap-1.5"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

