'use client'

import React, { useState, useMemo } from 'react'
import {
  Search,
  User,
  Check,
  ChevronDown,
  X,
  UserX,
  Briefcase,
  IdCard,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AssignableEmployee } from '@/lib/actions/team'
import { getProfilePhotoUrl } from '@/lib/utils/profile-photos'
import { cn } from '@/lib/utils'

export interface ContentEmployeeSelectProps {
  employees: AssignableEmployee[]
  value?: string | null // employee UUID or employee_id
  onChange: (employee: AssignableEmployee | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: 'start' | 'center' | 'end'
  allowClear?: boolean
}

export function ContentEmployeeSelect({
  employees,
  value,
  onChange,
  placeholder = 'Select Content Employee...',
  disabled = false,
  className,
  align = 'start',
  allowClear = true,
}: ContentEmployeeSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Resolve currently selected employee by id, employee_id, or name
  const selectedEmployee = useMemo(() => {
    if (!value) return null
    const valClean = String(value).trim().toLowerCase()
    return (
      employees.find(
        (e) =>
          String(e.id).trim().toLowerCase() === valClean ||
          (e.employee_id && String(e.employee_id).trim().toLowerCase() === valClean) ||
          (e.name && e.name.trim().toLowerCase() === valClean)
      ) || null
    )
  }, [employees, value])

  // Filter employees by search query across Name, Employee ID, and Designation
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees
    const q = searchQuery.trim().toLowerCase()
    return employees.filter((emp) => {
      const matchName = emp.name.toLowerCase().includes(q)
      const matchId = (emp.employee_id || '').toLowerCase().includes(q)
      const matchDesig = (emp.designation || '').toLowerCase().includes(q)
      const matchDept = (emp.department || '').toLowerCase().includes(q)
      return matchName || matchId || matchDesig || matchDept
    })
  }, [employees, searchQuery])

  const initials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-xs transition-all outline-none cursor-pointer',
          'hover:border-border hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50',
          disabled && 'opacity-60 cursor-not-allowed',
          className
        )}
      >
          {selectedEmployee ? (
            <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
              <Avatar className="h-6 w-6 border border-border/70 shrink-0 text-[10px] bg-secondary">
                {selectedEmployee.profile_photo && (
                  <AvatarImage
                    src={getProfilePhotoUrl(selectedEmployee.profile_photo) || undefined}
                    alt={selectedEmployee.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="font-semibold text-[10px]">
                  {initials(selectedEmployee.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <span className="font-semibold text-foreground truncate text-xs">
                  {selectedEmployee.name}
                </span>
                {selectedEmployee.employee_id && (
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-secondary text-muted-foreground shrink-0 border border-border/60">
                    {selectedEmployee.employee_id}
                  </span>
                )}
                {selectedEmployee.designation && (
                  <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                    • {selectedEmployee.designation}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground flex-1 text-left">
              <User className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">{placeholder}</span>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {allowClear && selectedEmployee && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onChange(null)
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                title="Clear selection (Unassigned)"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground opacity-70" />
          </div>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-[340px] sm:w-[380px] p-2 bg-popover/95 backdrop-blur-md border border-border/90 rounded-2xl shadow-2xl z-[150]"
      >
        {/* Search Input */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs bg-background/80 border-border/80 rounded-lg shadow-xs"
            autoFocus
          />
        </div>

        {/* Clear / Unassigned Option */}
        {allowClear && (
          <div
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs mb-1',
              !selectedEmployee
                ? 'bg-secondary text-foreground font-semibold border border-border/80'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary/80 border border-border/60 flex items-center justify-center">
                <UserX className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <span className="font-medium text-xs block">Unassigned</span>
                <span className="text-[10px] text-muted-foreground">No team member assigned</span>
              </div>
            </div>
            {!selectedEmployee && <Check className="w-3.5 h-3.5 text-primary" />}
          </div>
        )}

        {/* Section Label */}
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-t border-border/40 flex items-center justify-between">
          <span>Active Content Staff ({filteredEmployees.length})</span>
          <span className="text-[9px] font-normal text-emerald-400">Content Department</span>
        </div>

        {/* Employee List */}
        <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
          {filteredEmployees.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground italic">
              No Content department employees found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected =
                selectedEmployee &&
                (selectedEmployee.id === emp.id || selectedEmployee.employee_id === emp.employee_id)
              const photoUrl = getProfilePhotoUrl(emp.profile_photo)
              const status = emp.employment_status || 'Active'

              return (
                <div
                  key={emp.id}
                  onClick={() => {
                    onChange(emp)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all text-left group',
                    isSelected
                      ? 'bg-foreground/10 border border-foreground/30 text-foreground'
                      : 'hover:bg-secondary/60 border border-transparent text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar className="w-8 h-8 border border-border/80 shrink-0 text-xs bg-secondary">
                      {photoUrl && (
                        <AvatarImage src={photoUrl} alt={emp.name} className="object-cover" />
                      )}
                      <AvatarFallback className="font-semibold text-xs text-foreground">
                        {initials(emp.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate block">
                          {emp.name}
                        </span>
                        {emp.employee_id && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-secondary text-primary shrink-0 border border-primary/20">
                            {emp.employee_id}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="truncate">{emp.designation || 'Staff Member'}</span>
                        <span className="text-[10px] text-muted-foreground/60">•</span>
                        <span className="text-emerald-400 font-medium text-[10px]">{status}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
