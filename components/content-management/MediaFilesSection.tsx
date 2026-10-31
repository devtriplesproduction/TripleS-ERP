'use client'

import React, { useState, useRef } from 'react'
import {
  FileText,
  UploadCloud,
  Loader2,
  Plus,
  Eye,
  Download,
  Trash2,
  FileImage,
  FileArchive,
  FileCode,
  File as FileIcon,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Calendar,
  User,
  HardDrive,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { ContentAttachment } from '@/types/content-management'
import { AuthUser } from '@/lib/auth'
import { uploadContentAttachment, deleteContentAttachment } from '@/lib/actions/content-management'
import { useToast } from '@/hooks/use-toast'
import dayjs from 'dayjs'

interface MediaFilesSectionProps {
  initialAttachments: ContentAttachment[]
  user: AuthUser
}

export function MediaFilesSection({ initialAttachments, user }: MediaFilesSectionProps) {
  const [attachments, setAttachments] = useState<ContentAttachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [isPrivateUpload, setIsPrivateUpload] = useState(false)

  // Preview & Delete modals
  const [previewAttachment, setPreviewAttachment] = useState<ContentAttachment | null>(null)
  const [itemToDelete, setItemToDelete] = useState<ContentAttachment | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const isHod = user.is_hod || /\b(hod|head of department|head of content)\b/i.test(user.designation || '')
  const isAdmin = user.role === 'Admin'
  const isAuthorizedManager = isAdmin || isHod

  // Helpers
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileCategory = (mime: string, name: string): 'Image' | 'PDF' | 'Document' | 'Archive' | 'Data' => {
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase()
    if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) {
      return 'Image'
    }
    if (mime === 'application/pdf' || ext === '.pdf') {
      return 'PDF'
    }
    if (['.zip', '.tar', '.gz', '.rar', '.7z'].includes(ext) || mime.includes('zip')) {
      return 'Archive'
    }
    if (['.json', '.csv', '.xml'].includes(ext) || mime.includes('json') || mime.includes('csv')) {
      return 'Data'
    }
    return 'Document'
  }

  const getFileIcon = (cat: string) => {
    switch (cat) {
      case 'Image':
        return <FileImage className="w-5 h-5 text-sky-400" />
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />
      case 'Archive':
        return <FileArchive className="w-5 h-5 text-amber-400" />
      case 'Data':
        return <FileCode className="w-5 h-5 text-emerald-400" />
      default:
        return <FileIcon className="w-5 h-5 text-indigo-400" />
    }
  }

  // Stats
  const totalFiles = attachments.length
  const totalSizeBytes = attachments.reduce((acc, a) => acc + (a.file_size || 0), 0)
  const imageCount = attachments.filter(a => getFileCategory(a.mime_type, a.file_name) === 'Image').length
  const pdfCount = attachments.filter(a => getFileCategory(a.mime_type, a.file_name) === 'PDF').length
  const privateCount = attachments.filter(a => a.is_private).length

  // Filtered files
  const filtered = attachments.filter(att => {
    const cat = getFileCategory(att.mime_type, att.file_name)
    if (categoryFilter === 'Images' && cat !== 'Image') return false
    if (categoryFilter === 'PDFs' && cat !== 'PDF') return false
    if (categoryFilter === 'Documents' && cat !== 'Document' && cat !== 'PDF') return false
    if (categoryFilter === 'Archives & Data' && cat !== 'Archive' && cat !== 'Data') return false
    if (categoryFilter === 'Private' && !att.is_private) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = att.file_name.toLowerCase().includes(q)
      const matchUploader = att.uploaded_by_name.toLowerCase().includes(q)
      const matchContent = att.content_title?.toLowerCase().includes(q)
      if (!matchName && !matchUploader && !matchContent) return false
    }

    return true
  })

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setError(null)

    // Validation
    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError('File exceeds maximum allowed size of 25MB.')
      return
    }

    const dangerous = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.msi']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (dangerous.includes(ext)) {
      setError(`Executable files (${ext}) are blocked for security.`)
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await uploadContentAttachment(fd, undefined, isPrivateUpload)
      if (res.success && res.data) {
        setAttachments(prev => [res.data!, ...prev])
        toast({
          title: 'File Uploaded Successfully',
          description: `"${file.name}" (${formatFileSize(file.size)}) uploaded.`,
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setError(res.error || 'Failed to upload file.')
      }
    } catch (err: any) {
      setError(err.message || 'Upload error')
    } finally {
      setUploading(false)
    }
  }

  // Handle Delete
  const handleDelete = async () => {
    if (!itemToDelete) return
    const res = await deleteContentAttachment(itemToDelete.id)
    if (res.success) {
      setAttachments(prev => prev.filter(a => a.id !== itemToDelete.id))
      toast({ title: 'Attachment Deleted', description: 'File permanently removed.' })
    } else {
      toast({ title: 'Delete Failed', description: res.error || 'Unauthorized', variant: 'destructive' })
    }
    setItemToDelete(null)
  }

  return (
    <div className="space-y-6">
      {/* Top Section Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            <span>Media and File Management</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Upload and organize technical documentation assets, images, API specs, and project attachments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800">
            <input
              type="checkbox"
              checked={isPrivateUpload}
              onChange={(e) => setIsPrivateUpload(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Mark upload as Private</span>
            </span>
          </label>

          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <UploadCloud className="w-4 h-4 mr-1.5" />
            )}
            <span>Upload New File</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.gif,.md,.txt,.json,.zip,.csv,.doc,.docx"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-between text-xs text-rose-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">✕</button>
        </div>
      )}

      {/* Storage Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-3">
            <span className="text-[11px] text-zinc-400">Total Files</span>
            <div className="text-xl font-bold text-zinc-100 mt-0.5">{totalFiles}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-3">
            <span className="text-[11px] text-zinc-400">Total Storage</span>
            <div className="text-xl font-bold text-indigo-300 mt-0.5">{formatFileSize(totalSizeBytes)}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-3">
            <span className="text-[11px] text-sky-400">Images & Visuals</span>
            <div className="text-xl font-bold text-sky-300 mt-0.5">{imageCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-3">
            <span className="text-[11px] text-rose-400">PDFs & Docs</span>
            <div className="text-xl font-bold text-rose-300 mt-0.5">{pdfCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-3">
            <span className="text-[11px] text-amber-400">Private / Restricted</span>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{privateCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {['All', 'Images', 'PDFs', 'Documents', 'Archives & Data', 'Private'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'bg-zinc-100 text-zinc-900 shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search by file name or uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100"
          />
        </div>
      </div>

      {/* File Catalog Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-3">Linked Content / Project</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3">Uploaded By</th>
                <th className="py-3 px-3">Upload Date</th>
                <th className="py-3 px-3">Access Policy</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <UploadCloud className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                    No media or file attachments found.
                  </td>
                </tr>
              ) : (
                filtered.map((file) => {
                  const cat = getFileCategory(file.mime_type, file.file_name)
                  const canDelete = isAdmin || isHod || file.uploaded_by_id === user.id
                  return (
                    <tr key={file.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-zinc-800/70 rounded border border-zinc-700/60 shrink-0">
                            {getFileIcon(cat)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-200 block truncate max-w-xs" title={file.file_name}>
                              {file.file_name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{file.mime_type}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-zinc-300 font-medium block truncate max-w-[180px]">
                          {file.content_title || 'General Department Asset'}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {file.project_name || 'Core Platform'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-zinc-300 border-zinc-700 font-mono text-[10px]">
                          {cat}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 font-mono text-zinc-300">
                        {formatFileSize(file.file_size)}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-zinc-200 font-medium">{file.uploaded_by_name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-zinc-400">
                        {dayjs(file.created_at).format('DD MMM YYYY, hh:mm A')}
                      </td>

                      <td className="py-3 px-3">
                        {file.is_private ? (
                          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center gap-1 w-fit">
                            <Lock className="w-3 h-3" />
                            <span>Restricted</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-1 w-fit">
                            <Unlock className="w-3 h-3" />
                            <span>Public</span>
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Action */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewAttachment(file)}
                            className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
                            title="Preview Attachment"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Download Action */}
                          <a
                            href={file.file_url}
                            download={file.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 px-2 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                            title="Download Attachment"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete Action */}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setItemToDelete(file)}
                              className="h-7 px-2 text-zinc-400 hover:text-rose-400"
                              title="Delete File"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
            <div className="px-6 py-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-100 truncate">{previewAttachment.file_name}</h3>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm p-1 rounded hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-zinc-950/60 min-h-[300px]">
              {previewAttachment.mime_type.startsWith('image/') ? (
                <div className="space-y-3 text-center">
                  <img
                    src={previewAttachment.file_url}
                    alt={previewAttachment.file_name}
                    className="max-h-96 max-w-full rounded-lg border border-zinc-800 object-contain shadow-lg"
                    onError={(e) => {
                      // Fallback icon if image placeholder
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="text-xs text-zinc-400">{previewAttachment.file_name}</div>
                </div>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="p-4 bg-zinc-900 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center border border-zinc-800">
                    {getFileIcon(getFileCategory(previewAttachment.mime_type, previewAttachment.file_name))}
                  </div>
                  <div className="text-sm font-semibold text-zinc-200">{previewAttachment.file_name}</div>
                  <div className="text-xs text-zinc-400">
                    Size: {formatFileSize(previewAttachment.file_size)} &bull; Type: {previewAttachment.mime_type}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Uploaded by {previewAttachment.uploaded_by_name} on {dayjs(previewAttachment.created_at).format('DD MMM YYYY')}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {previewAttachment.is_private ? '🔒 Restricted file' : '🌐 Public departmental asset'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.file_url}
                  download={previewAttachment.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewAttachment(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Attachment"
        description={`Are you sure you want to delete "${itemToDelete?.file_name}"? This file will be permanently removed.`}
        confirmText="Delete File"
        variant="destructive"
      />
    </div>
  )
}
