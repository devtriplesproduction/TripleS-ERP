'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Eye,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { uploadAccountingAttachmentAction } from '@/lib/actions/accounting'

interface AttachmentUploaderProps {
  label?: string
  helperText?: string
  value?: string | null
  onChange: (url: string) => void
  disabled?: boolean
  className?: string
}

export function AttachmentUploader({
  label = 'Attachment / Bill Proof',
  helperText = 'Upload PDF, PNG, or JPG/JPEG (Max 10MB)',
  value,
  onChange,
  disabled = false,
  className = '',
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Track if existing value is an image or PDF
  const isImageFile = (nameOrUrl: string) => {
    return /\.(png|jpe?g|webp)($|\?)/i.test(nameOrUrl)
  }

  const isPdfFile = (nameOrUrl: string) => {
    return /\.pdf($|\?)/i.test(nameOrUrl)
  }

  // Manage object URLs for local previews
  useEffect(() => {
    if (selectedFile) {
      const objUrl = URL.createObjectURL(selectedFile)
      setPreviewUrl(objUrl)
      return () => {
        URL.revokeObjectURL(objUrl)
      }
    } else {
      setPreviewUrl(null)
    }
  }, [selectedFile])

  const validateFile = (file: File): string | null => {
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg']
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!allowedExtensions.includes(ext) && (!allowedMimes.includes(file.type) || !file.type)) {
      return 'Invalid file type. Only PDF, PNG, and JPG/JPEG files are allowed.'
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
      return `File size (${sizeMb} MB) exceeds the 10MB limit.`
    }

    return null
  }

  const handleFileProcess = async (file: File) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setSelectedFile(file)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await uploadAccountingAttachmentAction(formData)
      if (res.success && res.url) {
        onChange(res.url)
      } else {
        setError(res.error || 'Failed to upload attachment. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileProcess(file)
    }
    // reset input so same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileProcess(file)
    }
  }

  const handleRemove = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setSelectedFile(null)
    setError(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const currentDisplayUrl = previewUrl || value
  const hasAttachment = Boolean(selectedFile || value)
  const isImage = selectedFile
    ? selectedFile.type.startsWith('image/')
    : value
    ? isImageFile(value)
    : false
  const isPdf = selectedFile
    ? selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')
    : value
    ? isPdfFile(value)
    : false

  const displayName = selectedFile
    ? selectedFile.name
    : value
    ? value.split('/').pop()?.split('?')[0] || 'Attached Document'
    : ''

  const handleOpenPreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isImage) {
      setIsPreviewOpen(true)
    } else if (currentDisplayUrl) {
      window.open(currentDisplayUrl, '_blank')
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-primary" />
          {label}
        </Label>
        <span className="text-[11px] text-muted-foreground">{helperText}</span>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
      />

      {/* Active Attachment Preview Card */}
      {hasAttachment ? (
        <div className="rounded-lg border border-border bg-card/60 p-3 flex items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {/* Thumbnail or File Icon */}
            {isImage && currentDisplayUrl ? (
              <div
                onClick={handleOpenPreview}
                className="relative w-12 h-12 rounded-md overflow-hidden bg-muted border border-border shrink-0 cursor-pointer group"
                title="Click to preview"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentDisplayUrl}
                  alt={displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md bg-muted/60 border border-border flex flex-col items-center justify-center shrink-0">
                {isPdf ? (
                  <>
                    <FileText className="w-5 h-5 text-rose-500" />
                    <span className="text-[9px] font-bold text-rose-600 mt-0.5">PDF</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                    <span className="text-[9px] font-bold text-indigo-600 mt-0.5">IMG</span>
                  </>
                )}
              </div>
            )}

            {/* File Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[260px]" title={displayName}>
                  {displayName}
                </p>
                {isUploading ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedFile ? (
                  formatFileSize(selectedFile.size)
                ) : (
                  <span className="text-muted-foreground/80">Saved reference</span>
                )}
                {isPdf && ' • PDF Document'}
                {isImage && ' • Image'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {currentDisplayUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenPreview}
                className="h-8 px-2.5 text-xs gap-1 border-border bg-background hover:bg-muted text-foreground"
                title="Preview attachment"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="h-8 px-2.5 text-xs border-border bg-background hover:bg-muted text-foreground"
              title="Replace file"
            >
              Replace
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="h-8 px-2 text-xs border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              title="Remove attachment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        /* Dropzone when no file selected */
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-border/80 hover:border-primary/60 hover:bg-muted/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-foreground">
            Click to upload <span className="text-muted-foreground font-normal">or drag & drop</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Supports PDF, PNG, JPG/JPEG up to 10MB
          </p>
        </div>
      )}

      {/* Validation / Upload Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Lightbox / Image Preview Modal */}
      {isImage && currentDisplayUrl && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl bg-card border-border p-4">
            <DialogHeader className="pb-2 border-b border-border/50">
              <DialogTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="truncate max-w-[400px]">{displayName}</span>
                <a
                  href={currentDisplayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline ml-4"
                >
                  Open Original <ExternalLink className="w-3 h-3" />
                </a>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-2 bg-muted/20 rounded-md max-h-[70vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentDisplayUrl}
                alt={displayName}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
