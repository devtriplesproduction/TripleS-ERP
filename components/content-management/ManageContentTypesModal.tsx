'use client'

import React, { useState } from 'react'
import {
  Layers,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Tag,
  ShieldCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ContentType } from '@/types/content-management'
import dayjs from 'dayjs'

interface ManageContentTypesModalProps {
  isOpen: boolean
  onClose: () => void
  contentTypes: ContentType[]
  onCreateType: (name: string, description?: string) => Promise<void>
  onToggleStatus: (id: string, isActive: boolean) => Promise<void>
}

export function ManageContentTypesModal({
  isOpen,
  onClose,
  contentTypes,
  onCreateType,
  onToggleStatus,
}: ManageContentTypesModalProps) {
  const [typeName, setTypeName] = useState('')
  const [typeDescription, setTypeDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!typeName.trim()) {
      setError('Content Type name is required.')
      return
    }

    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      await onCreateType(typeName.trim(), typeDescription.trim())
      setTypeName('')
      setTypeDescription('')
      setSuccessMsg('Content Type added successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setError(err?.message || 'Failed to add Content Type.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setLoading(true)
    setError('')
    try {
      await onToggleStatus(id, !currentStatus)
    } catch (err: any) {
      setError(err?.message || 'Failed to update Content Type.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[750px] max-h-[90vh] overflow-y-auto p-6 border-border bg-background">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Manage Content Types
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Administrator settings for defining and toggling department Content Types.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Important Notice */}
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <strong className="font-semibold">Integrity Rule:</strong> Deactivating a Content Type will NOT change or delete existing content records that use it. Existing records retain their original Content Type. Inactive Content Types are excluded from the selection dropdown when creating new content.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          {/* Form: Add New Content Type */}
          <form onSubmit={handleAddType} className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Add New Content Type</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  placeholder="Content Type Name (e.g. Whitepaper)"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="text-xs h-9 bg-card"
                />
              </div>
              <div>
                <Input
                  placeholder="Optional description"
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                  className="text-xs h-9 bg-card"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="h-8 px-3 text-xs bg-foreground text-background hover:bg-foreground/90 font-medium gap-1"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add Content Type
              </Button>
            </div>
          </form>

          {/* Content Types Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configured Content Types</h4>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-2.5 px-3 font-medium">Content Type</th>
                    <th className="py-2.5 px-3 font-medium">Description</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {contentTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {type.name}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-[240px] truncate">
                        {type.description || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            type.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]'
                              : 'bg-muted/40 text-muted-foreground border-border text-[10px]'
                          }
                        >
                          {type.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleToggle(type.id, type.is_active)}
                          className={`h-7 px-2.5 text-[11px] ${
                            type.is_active
                              ? 'text-amber-600 hover:bg-amber-500/10 border-amber-500/30'
                              : 'text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30'
                          }`}
                        >
                          {type.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
