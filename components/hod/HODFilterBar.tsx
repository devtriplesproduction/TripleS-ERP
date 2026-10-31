'use client'

import React from 'react'
import {
  Calendar,
  FolderKanban,
  User,
  Activity,
  RotateCcw,
  Filter,
  CheckSquare,
} from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface HODFilterValues {
  startDate?: string
  endDate?: string
  projectId?: string
  developerId?: string
  projectStatus?: string
  taskStatus?: string
}

export interface HODFilterBarProps {
  projects?: Array<{ id: string; name: string }>
  developers?: Array<{ id: string; name: string; department?: string | null }>
  
  showDateRange?: boolean
  showProject?: boolean
  showDeveloper?: boolean
  showProjectStatus?: boolean
  showTaskStatus?: boolean

  values: HODFilterValues
  onChange: (newValues: HODFilterValues) => void
  onReset: () => void

  className?: string
  label?: string
}

export const PROJECT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Project Statuses' },
  { value: 'PLANNED', label: 'Planning' },
  { value: 'IN_PROGRESS', label: 'Active / In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export const TASK_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Task Statuses' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'ON_HOLD', label: 'On Hold / Blocked' },
]

export function HODFilterBar({
  projects = [],
  developers = [],
  showDateRange = true,
  showProject = true,
  showDeveloper = true,
  showProjectStatus = true,
  showTaskStatus = false,
  values,
  onChange,
  onReset,
  className,
  label = 'Filters',
}: HODFilterBarProps) {
  // Deduplicate and prepare project options
  const projectOptions = React.useMemo(() => {
    return [
      { value: 'ALL', label: 'All Projects' },
      ...projects.map((p) => ({
        value: p.id,
        label: p.name,
      })),
    ]
  }, [projects])

  // Deduplicate and prepare developer options
  const developerOptions = React.useMemo(() => {
    // If developers has department info, prefer Development department
    const devList = developers.length > 0 ? developers : []
    return [
      { value: 'ALL', label: 'All Developers' },
      ...devList.map((d) => ({
        value: d.id,
        label: d.name,
      })),
    ]
  }, [developers])

  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (values.startDate) count++
    if (values.endDate) count++
    if (values.projectId && values.projectId !== 'ALL') count++
    if (values.developerId && values.developerId !== 'ALL') count++
    if (values.projectStatus && values.projectStatus !== 'ALL') count++
    if (values.taskStatus && values.taskStatus !== 'ALL') count++
    return count
  }, [values])

  const isFiltered = activeFiltersCount > 0

  return (
    <div
      className={cn(
        'w-full bg-card/95 border border-border/80 rounded-xl p-3 sm:p-3.5 shadow-xs transition-all duration-200',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Filter Title & Active Count Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {isFiltered && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[11px] font-medium bg-primary/15 text-primary border-none"
            >
              {activeFiltersCount} active
            </Badge>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-start lg:justify-end">
          {/* 1. Date Range: From Date */}
          {showDateRange && (
            <div className="w-full sm:w-[145px] shrink-0">
              <DatePicker
                value={values.startDate || ''}
                onChange={(date) => onChange({ ...values, startDate: date })}
                placeholder="From Date"
                isClearable
                iconLeft
                className="h-9 text-xs rounded-lg border-border/80 bg-background hover:border-foreground/30 shadow-2xs"
              />
            </div>
          )}

          {/* 1. Date Range: To Date */}
          {showDateRange && (
            <div className="w-full sm:w-[145px] shrink-0">
              <DatePicker
                value={values.endDate || ''}
                onChange={(date) => onChange({ ...values, endDate: date })}
                placeholder="To Date"
                isClearable
                iconLeft
                className="h-9 text-xs rounded-lg border-border/80 bg-background hover:border-foreground/30 shadow-2xs"
              />
            </div>
          )}

          {/* 2. Project Dropdown */}
          {showProject && (
            <div className="w-full sm:w-auto min-w-[150px] max-w-[220px] shrink-0">
              <Dropdown
                value={values.projectId || 'ALL'}
                onChange={(val) => onChange({ ...values, projectId: val || 'ALL' })}
                options={projectOptions}
                placeholder="All Projects"
                className="w-full space-y-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-2.5 rounded-lg border-border/80 bg-background font-normal shadow-2xs hover:border-foreground/30 transition-colors"
              />
            </div>
          )}

          {/* 3. Developer Dropdown */}
          {showDeveloper && (
            <div className="w-full sm:w-auto min-w-[150px] max-w-[200px] shrink-0">
              <Dropdown
                value={values.developerId || 'ALL'}
                onChange={(val) => onChange({ ...values, developerId: val || 'ALL' })}
                options={developerOptions}
                placeholder="All Developers"
                className="w-full space-y-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-2.5 rounded-lg border-border/80 bg-background font-normal shadow-2xs hover:border-foreground/30 transition-colors"
              />
            </div>
          )}

          {/* 4. Project Status Dropdown */}
          {showProjectStatus && (
            <div className="w-full sm:w-auto min-w-[145px] shrink-0">
              <Dropdown
                value={values.projectStatus || 'ALL'}
                onChange={(val) => onChange({ ...values, projectStatus: val || 'ALL' })}
                options={PROJECT_STATUS_OPTIONS}
                placeholder="All Project Statuses"
                className="w-full space-y-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-2.5 rounded-lg border-border/80 bg-background font-normal shadow-2xs hover:border-foreground/30 transition-colors"
              />
            </div>
          )}

          {/* Task Status Dropdown (if enabled) */}
          {showTaskStatus && (
            <div className="w-full sm:w-auto min-w-[135px] shrink-0">
              <Dropdown
                value={values.taskStatus || 'ALL'}
                onChange={(val) => onChange({ ...values, taskStatus: val || 'ALL' })}
                options={TASK_STATUS_OPTIONS}
                placeholder="All Task Statuses"
                className="w-full space-y-0"
                buttonClassName="!h-9 !min-h-[36px] !max-h-[36px] !text-xs px-2.5 rounded-lg border-border/80 bg-background font-normal shadow-2xs hover:border-foreground/30 transition-colors"
              />
            </div>
          )}

          {/* Reset / Clear Filters Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!isFiltered}
            className={cn(
              'h-9 px-3 text-xs font-medium rounded-lg border-border/80 transition-colors shrink-0',
              isFiltered
                ? 'text-foreground hover:bg-secondary/80 bg-background hover:border-foreground/30 shadow-2xs'
                : 'text-muted-foreground/60 opacity-60 cursor-not-allowed border-dashed'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
