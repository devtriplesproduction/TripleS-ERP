'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  User,
  Plus,
  X,
  Search,
  Check,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { AssignableEmployee, getAssignableEmployees } from '@/lib/actions/team'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import { cn } from '@/lib/utils'

export interface TaskAssigneeSelectorProps {
  employees?: AssignableEmployee[]
  selectedAssignees: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
  label?: string
  hideLabel?: boolean
  compact?: boolean
  placeholder?: string
  searchPlaceholder?: string
  popoverAlign?: 'start' | 'center' | 'end'
  className?: string
  // Optional fallback for edit mode where existing task assignees or project members may not be in employees list
  taskAssigneesFallback?: Array<{
    user_id: string
    profile?: { first_name?: string | null; last_name?: string | null; profile_photo?: string | null; designation?: string | null; department?: string | null } | null
    employee_name?: string | null
    avatar_url?: string | null
  }>
  membersFallback?: Array<{
    user_id: string
    profile?: { first_name?: string | null; last_name?: string | null; profile_photo?: string | null; designation?: string | null; department?: string | null } | null
    employee_name?: string | null
    avatar_url?: string | null
  }>
}

export function TaskAssigneeSelector({
  employees: propEmployees,
  selectedAssignees,
  onChange,
  disabled = false,
  label = 'ASSIGN MEMBERS',
  hideLabel = false,
  compact = false,
  placeholder = 'No members assigned',
  searchPlaceholder = 'Search members...',
  popoverAlign = 'start',
  className,
  taskAssigneesFallback,
  membersFallback,
}: TaskAssigneeSelectorProps) {
  const effectiveFallback = membersFallback || taskAssigneesFallback
  const [internalEmployees, setInternalEmployees] = useState<AssignableEmployee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // If employees prop is not provided or empty, load from getAssignableEmployees
  useEffect(() => {
    if (propEmployees && propEmployees.length > 0) {
      setInternalEmployees(propEmployees)
    } else {
      setIsLoading(true)
      getAssignableEmployees()
        .then((res) => {
          if (res.success && res.data) {
            setInternalEmployees(res.data)
          }
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [propEmployees])

  // Listen for employee status changes (deactivation / reactivation) across the ERP
  useEffect(() => {
    const handleStatusChanged = () => {
      getAssignableEmployees().then((res) => {
        if (res.success && res.data) {
          setInternalEmployees(res.data)
        }
      })
    }
    window.addEventListener('employee-status-changed', handleStatusChanged)
    return () => {
      window.removeEventListener('employee-status-changed', handleStatusChanged)
    }
  }, [])

  const effectiveEmployees = propEmployees && propEmployees.length > 0 ? propEmployees : internalEmployees

  // Filtered employees by search query
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return effectiveEmployees
    return effectiveEmployees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.designation && emp.designation.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.employee_id && emp.employee_id.toLowerCase().includes(q))
    )
  }, [effectiveEmployees, searchQuery])

  const toggleAssignee = (empId: string) => {
    if (disabled) return
    if (selectedAssignees.includes(empId)) {
      onChange(selectedAssignees.filter((id) => id !== empId))
    } else {
      onChange(Array.from(new Set([...selectedAssignees, empId])))
    }
  }

  const handleSelectAllFiltered = () => {
    if (disabled) return
    const idsToAdd = filteredEmployees.map((e) => e.id)
    onChange(Array.from(new Set([...selectedAssignees, ...idsToAdd])))
  }

  const handleDeselectAll = () => {
    if (disabled) return
    if (searchQuery.trim()) {
      const idsToRemove = new Set(filteredEmployees.map((e) => e.id))
      onChange(selectedAssignees.filter((id) => !idsToRemove.has(id)))
    } else {
      onChange([])
    }
  }

  const removeAssignee = (e: React.MouseEvent, empId: string) => {
    e.stopPropagation()
    if (disabled) return
    onChange(selectedAssignees.filter((id) => id !== empId))
  }

  const uniqueSelected = Array.from(new Set(selectedAssignees))

  return (
    <div className={cn('space-y-1.5 select-none', className)}>
      {!hideLabel && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <User className="h-3.5 w-3.5" />
          <span>{label}</span>
          {uniqueSelected.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-foreground text-background font-bold lowercase">
              {uniqueSelected.length}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full rounded-xl border border-border/80 bg-background flex flex-wrap items-center gap-1.5 transition-colors focus-within:border-foreground/50',
          compact ? 'min-h-[40px] p-1.5' : 'min-h-[50px] p-2 sm:p-2.5',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {/* Selected Member Chips */}
        {uniqueSelected.map((empId) => {
          const emp = effectiveEmployees.find((e) => e.id === empId)
          const fallback = effectiveFallback?.find((a) => a.user_id === empId)
          const name =
            emp?.name ||
            (fallback?.profile
              ? `${fallback.profile.first_name || ''} ${fallback.profile.last_name || ''}`.trim()
              : fallback?.employee_name) ||
            'Team Member'
          const rawPhoto = emp?.profile_photo || fallback?.profile?.profile_photo || fallback?.avatar_url
          const photoUrl = getProfilePhotoUrl(rawPhoto)
          const initials = name.substring(0, 2).toUpperCase()

          const isInactive = !emp && !!fallback

          return (
            <div
              key={empId}
              className={cn(
                'inline-flex items-center rounded-full border font-medium shadow-xs animate-in fade-in-50 zoom-in-95 duration-150',
                isInactive
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-secondary/90 border-border text-foreground',
                compact ? 'gap-1.5 pl-1 pr-2 py-0.5 text-[11px]' : 'gap-2 pl-1.5 pr-2.5 py-1 text-xs'
              )}
            >
              <Avatar
                className={cn(
                  'border border-border/70 shrink-0',
                  compact ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'
                )}
              >
                {photoUrl && <AvatarImage src={photoUrl} alt={name} className="object-cover" />}
                <AvatarFallback className="bg-background text-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className={cn('truncate font-medium', isInactive ? 'text-amber-300' : 'text-foreground', compact ? 'max-w-[110px]' : 'max-w-[140px]')}>
                {name}
              </span>
              {isInactive && (
                <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded shrink-0">
                  Reassign
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeAssignee(e, empId)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted/60 transition-colors cursor-pointer ml-0.5"
                  title={`Remove ${name}`}
                >
                  <X className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
                </button>
              )}
            </div>
          )
        })}

        {/* Circular + Button & Search Popover */}
        {!disabled && (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger
              type="button"
              className={cn(
                'rounded-full border border-dashed flex items-center justify-center transition-all cursor-pointer outline-hidden shrink-0',
                compact ? 'w-7 h-7' : 'w-8 h-8',
                isPopoverOpen
                  ? 'border-foreground text-foreground bg-foreground/10 shadow-xs'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground hover:bg-muted/30'
              )}
              aria-label="Add members"
              title="Add members"
            >
              <Plus className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </PopoverTrigger>

            <PopoverContent
              align={popoverAlign}
              sideOffset={8}
              className="w-72 sm:w-80 p-3 bg-popover/95 backdrop-blur-md border border-border/90 rounded-xl shadow-2xl z-[120]"
            >
              {/* Search Input */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background border-border rounded-lg"
                  autoFocus
                />
              </div>

              {/* Select All / Deselect All Controls */}
              <div className="flex items-center justify-between pb-2 px-1 text-[11px] text-muted-foreground border-b border-border/40 mb-1.5">
                <span>
                  {filteredEmployees.length} {filteredEmployees.length === 1 ? 'member' : 'members'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    Select all
                  </button>
                  <span className="opacity-40">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="hover:text-foreground font-medium cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {/* Member List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                {isLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading members...</span>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground italic">
                    No team members found.
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedAssignees.includes(emp.id)
                    const initials = emp.name.substring(0, 2).toUpperCase()
                    const photoUrl = getProfilePhotoUrl(emp.profile_photo)
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleAssignee(emp.id)}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-left',
                          isSelected
                            ? 'bg-secondary border border-border text-foreground font-medium'
                            : 'hover:bg-secondary/60 border border-transparent text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-8 h-8 border border-border/80 shrink-0 text-xs">
                            {photoUrl && <AvatarImage src={photoUrl} alt={emp.name} className="object-cover" />}
                            <AvatarFallback className="bg-secondary text-foreground font-semibold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-xs truncate leading-tight">{emp.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                              {emp.designation || emp.department || 'Team Member'}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-foreground shrink-0 ml-2 stroke-[2.5]" />}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Done Button */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border/50 mt-2">
                <span className="text-[11px] text-muted-foreground">
                  {uniqueSelected.length} selected
                </span>
                <Button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  className="bg-foreground text-background hover:bg-foreground/90 text-xs px-4 h-7 rounded-md font-medium shadow-sm cursor-pointer"
                >
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Empty placeholder if no assignees selected and disabled */}
        {uniqueSelected.length === 0 && disabled && (
          <span className="text-xs text-muted-foreground italic px-1">{placeholder}</span>
        )}
      </div>
    </div>
  )
}

export const ProjectMemberSelector = TaskAssigneeSelector

