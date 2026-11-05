'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  Camera,
  Calendar,
  Clock,
  Search,
  Maximize2,
  ExternalLink,
  Laptop,
  Check,
  Grid3X3,
  LayoutGrid,
  X,
  Layers,
  ArrowUpDown,
  User,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Monitor
} from 'lucide-react'
import type { ScreenshotItem } from '@/lib/actions/time-tracking'
import {
  getScreenshotsForEmployeeAndDate,
  deleteScreenshotsAction
} from '@/lib/actions/time-tracking'
import {
  getTodayIST,
  getYesterdayIST,
  getDaysAgoIST,
  formatDate,
  formatDateReadable
} from '@/lib/utils/date'
import { ScreenshotLightboxModal } from './ScreenshotLightboxModal'
import { DeleteScreenshotConfirmationModal } from './DeleteScreenshotConfirmationModal'
import { DatePicker } from '@/components/ui/date-picker'
import { Dropdown } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'

interface EmployeeScreenshotsGalleryProps {
  screenshots: ScreenshotItem[]
  employeeName?: string
  selectedDate: string
  onDateChange?: (date: string) => void
  availableEmployees?: Array<{ id: string; name: string; count?: number }>
  selectedEmployeeId?: string
  onEmployeeChange?: (empId: string) => void
  sessions?: Array<{ id: string; clock_in: string; clock_out: string | null }>
  isLoading?: boolean
  onRefreshDashboard?: () => void
}

type QuickFilterType = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'

export function EmployeeScreenshotsGallery({
  screenshots: initialScreenshots,
  employeeName,
  selectedDate,
  onDateChange,
  availableEmployees,
  selectedEmployeeId,
  onEmployeeChange,
  sessions = [],
  isLoading: initialLoading = false,
  onRefreshDashboard
}: EmployeeScreenshotsGalleryProps) {
  // -------------------------------------------------------------
  // Filter States
  // -------------------------------------------------------------
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('today')
  const [startDate, setStartDate] = useState<string>(selectedDate || getTodayIST())
  const [endDate, setEndDate] = useState<string>(selectedDate || getTodayIST())
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [currentEmpId, setCurrentEmpId] = useState<string>(selectedEmployeeId || 'All')

  // Secondary Filters
  const [selectedSessionId, setSelectedSessionId] = useState<string>('All')
  const [selectedApp, setSelectedApp] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [gridDensity, setGridDensity] = useState<'compact' | 'normal' | 'large'>('normal')

  // -------------------------------------------------------------
  // Data & Fetch States
  // -------------------------------------------------------------
  const [galleryScreenshots, setGalleryScreenshots] = useState<ScreenshotItem[]>(initialScreenshots || [])
  const [isQuerying, setIsQuerying] = useState<boolean>(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // -------------------------------------------------------------
  // Selection & Bulk Actions State
  // -------------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // -------------------------------------------------------------
  // Delete Modal State
  // -------------------------------------------------------------
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: 'single' | 'bulk'
    targetId?: string
    count: number
    title?: string
  }>({
    isOpen: false,
    type: 'single',
    count: 0
  })
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // -------------------------------------------------------------
  // Lightbox State
  // -------------------------------------------------------------
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Track failed image URLs
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({})

  // Keep internal empId in sync when parent prop changes
  useEffect(() => {
    if (selectedEmployeeId && selectedEmployeeId !== currentEmpId) {
      setCurrentEmpId(selectedEmployeeId)
    }
  }, [selectedEmployeeId])

  // Clear toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Track if initial query was executed
  const isFirstRender = useRef(true)

  // -------------------------------------------------------------
  // Query Execution for Date/Time/Employee Filtering
  // -------------------------------------------------------------
  const executeQuery = useCallback(async (opts?: {
    sDate?: string
    eDate?: string
    sTime?: string
    eTime?: string
    eId?: string
  }) => {
    const qStartDate = opts?.sDate ?? startDate
    const qEndDate = opts?.eDate ?? endDate
    const qStartTime = opts?.sTime ?? startTime
    const qEndTime = opts?.eTime ?? endTime
    const qEmpId = opts?.eId ?? currentEmpId

    setIsQuerying(true)
    setQueryError(null)

    try {
      const res = await getScreenshotsForEmployeeAndDate({
        startDate: qStartDate,
        endDate: qEndDate,
        startTime: qStartTime || undefined,
        endTime: qEndTime || undefined,
        employeeId: qEmpId !== 'All' ? qEmpId : undefined
      })

      if (res.success) {
        setGalleryScreenshots(res.screenshots)
        // Clean selectedIds that are no longer in result
        setSelectedIds(prev => {
          const validIds = new Set(res.screenshots.map(s => s.id))
          const next = new Set<string>()
          for (const id of prev) {
            if (validIds.has(id)) next.add(id)
          }
          return next
        })
      } else {
        setQueryError(res.error || 'Failed to fetch screenshots')
      }
    } catch (err: any) {
      setQueryError(err.message || 'An error occurred while fetching screenshots')
    } finally {
      setIsQuerying(false)
    }
  }, [startDate, endDate, startTime, endTime, currentEmpId])

  // Re-fetch when date boundaries, time boundaries, or employee changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      // If initialScreenshots already present for today, use them; otherwise query
      if (initialScreenshots && initialScreenshots.length > 0 && quickFilter === 'today' && !startTime && !endTime) {
        setGalleryScreenshots(initialScreenshots)
        return
      }
    }
    executeQuery()
  }, [startDate, endDate, startTime, endTime, currentEmpId])

  // Also update gallery when parent prop `initialScreenshots` updates and we are in default today view
  useEffect(() => {
    if (quickFilter === 'today' && !startTime && !endTime && initialScreenshots) {
      setGalleryScreenshots(initialScreenshots)
    }
  }, [initialScreenshots, quickFilter, startTime, endTime])

  // -------------------------------------------------------------
  // Deletion Handlers
  // -------------------------------------------------------------
  const handleDeleteSingle = (id: string, title?: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'single',
      targetId: id,
      count: 1,
      title
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setDeleteModal({
      isOpen: true,
      type: 'bulk',
      count: selectedIds.size,
      title: `${selectedIds.size} selected ${selectedIds.size === 1 ? 'screenshot' : 'screenshots'}`
    })
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const idsToDelete = deleteModal.type === 'single' && deleteModal.targetId
        ? [deleteModal.targetId]
        : Array.from(selectedIds)

      if (idsToDelete.length === 0) return

      const res = await deleteScreenshotsAction(idsToDelete)

      if (res.success) {
        // Remove deleted items from local state
        const deletedSet = new Set(idsToDelete)
        setGalleryScreenshots(prev => prev.filter(s => !deletedSet.has(s.id)))
        setSelectedIds(prev => {
          const next = new Set(prev)
          for (const id of idsToDelete) next.delete(id)
          return next
        })

        setToastMessage({
          type: 'success',
          text: `Successfully deleted ${res.deletedCount} screenshot${res.deletedCount === 1 ? '' : 's'}.`
        })

        // Close lightbox if current image was deleted
        if (lightboxIndex !== null) {
          setLightboxIndex(null)
        }

        // Notify parent dashboard to refresh telemetry counters if applicable
        onRefreshDashboard?.()
      } else {
        setToastMessage({
          type: 'error',
          text: res.error || 'Failed to delete screenshots.'
        })
      }
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'An error occurred during deletion.'
      })
    } finally {
      setIsDeleting(false)
      setDeleteModal({ isOpen: false, type: 'single', count: 0 })
    }
  }

  const handleLightboxDelete = async (screenshotId: string): Promise<boolean> => {
    try {
      const res = await deleteScreenshotsAction([screenshotId])
      if (res.success) {
        setGalleryScreenshots(prev => prev.filter(s => s.id !== screenshotId))
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(screenshotId)
          return next
        })
        setToastMessage({
          type: 'success',
          text: 'Screenshot successfully deleted.'
        })
        onRefreshDashboard?.()
        return true
      } else {
        setToastMessage({
          type: 'error',
          text: res.error || 'Failed to delete screenshot.'
        })
        return false
      }
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Error deleting screenshot.'
      })
      return false
    }
  }

  // -------------------------------------------------------------
  // Selection Toggles
  // -------------------------------------------------------------
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredScreenshots.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredScreenshots.map(s => s.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // -------------------------------------------------------------
  // Date Preset Handlers
  // -------------------------------------------------------------
  const handleQuickFilter = (type: QuickFilterType) => {
    setQuickFilter(type)
    const today = getTodayIST()
    let s = today
    let e = today

    switch (type) {
      case 'today':
        s = today
        e = today
        break
      case 'yesterday':
        s = getYesterdayIST()
        e = getYesterdayIST()
        break
      case 'last7':
        s = getDaysAgoIST(6)
        e = today
        break
      case 'last30':
        s = getDaysAgoIST(29)
        e = today
        break
      case 'custom':
        return
    }

    setStartDate(s)
    setEndDate(e)
    onDateChange?.(s)
  }

  const handleEmployeeChange = (empId: string) => {
    setCurrentEmpId(empId)
    onEmployeeChange?.(empId)
  }

  // -------------------------------------------------------------
  // Time Preset Handlers
  // -------------------------------------------------------------
  const applyTimePreset = (preset: 'all' | 'morning' | 'afternoon' | 'evening') => {
    switch (preset) {
      case 'all':
        setStartTime('')
        setEndTime('')
        break
      case 'morning':
        setStartTime('09:00')
        setEndTime('13:00')
        break
      case 'afternoon':
        setStartTime('13:00')
        setEndTime('18:00')
        break
      case 'evening':
        setStartTime('18:00')
        setEndTime('22:00')
        break
    }
  }

  // -------------------------------------------------------------
  // Filter & Sort Logic for Display
  // -------------------------------------------------------------
  const uniqueApps = useMemo(() => {
    const apps = new Set<string>()
    for (const s of galleryScreenshots) {
      if (s.appName) apps.add(s.appName)
    }
    return Array.from(apps).sort()
  }, [galleryScreenshots])

  const uniqueSessions = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of galleryScreenshots) {
      if (!map.has(s.sessionId)) {
        map.set(s.sessionId, s.sessionDate)
      }
    }
    return Array.from(map.keys())
  }, [galleryScreenshots])

  const filteredScreenshots = useMemo(() => {
    let result = [...galleryScreenshots]

    // Secondary Filter: Session
    if (selectedSessionId !== 'All') {
      result = result.filter(s => s.sessionId === selectedSessionId)
    }

    // Secondary Filter: App
    if (selectedApp !== 'All') {
      result = result.filter(s => s.appName.toLowerCase() === selectedApp.toLowerCase())
    }

    // Secondary Filter: Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.appName.toLowerCase().includes(q) ||
        (s.windowTitle && s.windowTitle.toLowerCase().includes(q)) ||
        (s.employeeName && s.employeeName.toLowerCase().includes(q))
      )
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.capturedAt).getTime()
      const timeB = new Date(b.capturedAt).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })

    return result
  }, [galleryScreenshots, selectedSessionId, selectedApp, searchQuery, sortOrder])

  // Grid styling based on density
  const gridClasses = useMemo(() => {
    switch (gridDensity) {
      case 'compact':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
      case 'large':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
      case 'normal':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    }
  }, [gridDensity])

  const isLoading = initialLoading || isQuerying

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Query Error Notice */}
      {queryError && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{queryError}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* FILTER & CONTROL PANEL                                    */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        {/* ROW 1: Title, Quick Date Filters & Employee Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Camera size={18} className="text-primary" />
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Desktop Activity Screenshots
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                {filteredScreenshots.length} {filteredScreenshots.length === 1 ? 'Frame' : 'Frames'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Filtered screenshots in Asia/Kolkata timezone (IST).
              {startDate === endDate ? ` Showing date: ${startDate}` : ` Showing: ${startDate} to ${endDate}`}
              {(startTime || endTime) && ` (${startTime || '00:00'} - ${endTime || '23:59'})`}
            </p>
          </div>

          {/* Quick Date Range Filter Pills & Employee Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {uniqueApps.length > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                <Laptop size={12} className="text-primary" />
                <span className="font-semibold text-foreground">{uniqueApps.length}</span>
                <span>Apps</span>
              </span>
            )}

            <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => handleQuickFilter('today')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  quickFilter === 'today'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter('yesterday')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  quickFilter === 'yesterday'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter('last7')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  quickFilter === 'last7'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickFilter('last30')}
                className={`hidden md:block px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  quickFilter === 'last30'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                30 Days
              </button>
            </div>

            {/* Employee Selector (if multi-employee available) */}
            {availableEmployees && availableEmployees.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={currentEmpId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
                >
                  <option value="All">All Staff ({availableEmployees.length})</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.count !== undefined ? `(${emp.count})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Custom Date Inputs & Time Selection (IST) */}
        <div className="p-3 rounded-xl bg-muted/20 border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Calendar size={12} />
              <span>Date Range:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <div className="w-[130px]">
                <DatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val)
                    setQuickFilter('custom')
                  }}
                  placeholder="dd/mm/yyyy"
                  className="h-8 px-2.5 text-xs font-medium rounded-lg border-border bg-card text-foreground shadow-sm"
                />
              </div>
              <span className="text-muted-foreground font-medium">to</span>
              <div className="w-[130px]">
                <DatePicker
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val)
                    setQuickFilter('custom')
                  }}
                  placeholder="dd/mm/yyyy"
                  className="h-8 px-2.5 text-xs font-medium rounded-lg border-border bg-card text-foreground shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Specific Time Selection within Date Range */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Clock size={12} />
              <span>Time (IST):</span>
            </span>

            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="00:00"
                className="px-2.5 py-1 rounded-lg border border-border bg-card text-xs font-medium text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm font-mono"
                title="Start Time (IST)"
              />
              <span className="text-muted-foreground font-medium">to</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="23:59"
                className="px-2.5 py-1 rounded-lg border border-border bg-card text-xs font-medium text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm font-mono"
                title="End Time (IST)"
              />
            </div>

            {/* Time Presets Menu */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/80 text-[11px]">
              <button
                type="button"
                onClick={() => applyTimePreset('all')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  !startTime && !endTime ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset('morning')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  startTime === '09:00' && endTime === '13:00' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Morning
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset('afternoon')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  startTime === '13:00' && endTime === '18:00' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Afternoon
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset('evening')}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  startTime === '18:00' && endTime === '22:00' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Evening
              </button>
            </div>
          </div>

          {/* Refresh / Apply Filter Button */}
          <button
            type="button"
            onClick={() => executeQuery()}
            disabled={isQuerying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/60 text-foreground text-xs font-semibold shadow-sm transition-all"
            title="Re-query screenshots with active boundaries"
          >
            <RefreshCw size={13} className={isQuerying ? 'animate-spin text-primary' : ''} />
            <span>Apply Filter</span>
          </button>
        </div>

        {/* ROW 3: Bulk Actions, Secondary Filters & View Options */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-border/50 flex-wrap">
          {/* Left: Bulk Select & Delete Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filteredScreenshots.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors shadow-sm disabled:opacity-40"
            >
              {selectedIds.size > 0 && selectedIds.size === filteredScreenshots.length ? (
                <CheckSquare size={14} className="text-primary" />
              ) : selectedIds.size > 0 ? (
                <MinusSquare size={14} className="text-primary" />
              ) : (
                <Square size={14} className="text-muted-foreground" />
              )}
              <span>
                {selectedIds.size === filteredScreenshots.length && filteredScreenshots.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </span>
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-fade-in">
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold shadow-sm hover:bg-destructive/90 transition-all"
                >
                  <Trash2 size={13} />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Right: Secondary Filters & Display Options */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Session Selector */}
            {uniqueSessions.length > 1 && (
              <Dropdown
                value={selectedSessionId}
                onChange={setSelectedSessionId}
                options={[
                  { value: 'All', label: `All Sessions (${uniqueSessions.length})` },
                  ...uniqueSessions.map((sid, idx) => ({
                    value: sid,
                    label: `Session #${idx + 1} (${sid.slice(0, 8)}...)`
                  }))
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-8 !min-h-[32px] !max-h-[32px] !text-xs px-3 rounded-xl border-border bg-card font-medium shadow-xs hover:border-foreground/30 transition-colors min-w-[130px]"
              />
            )}

            {/* App Selector */}
            {uniqueApps.length > 0 && (
              <Dropdown
                value={selectedApp}
                onChange={setSelectedApp}
                options={[
                  { value: 'All', label: `All Apps (${uniqueApps.length})` },
                  ...uniqueApps.map((app) => ({
                    value: app,
                    label: app
                  }))
                ]}
                className="w-auto space-y-0 shrink-0"
                buttonClassName="!h-8 !min-h-[32px] !max-h-[32px] !text-xs px-3 rounded-xl border-border bg-card font-medium shadow-xs hover:border-foreground/30 transition-colors min-w-[120px]"
              />
            )}

            {/* Search Input */}
            <div className="relative min-w-[180px] max-w-[220px]">
              <Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search window / app..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-6 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs"
              title={`Sort by captured time: ${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}`}
            >
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>

            {/* Grid Density */}
            <div className="flex items-center rounded-xl border border-border bg-card p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setGridDensity('compact')}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-colors",
                  gridDensity === 'compact'
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                title="Compact Density"
              >
                <Grid3X3 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setGridDensity('normal')}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-colors",
                  gridDensity === 'normal'
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                title="Normal Density"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                onClick={() => setGridDensity('large')}
                className={cn(
                  "p-1.5 rounded-lg text-xs transition-colors",
                  gridDensity === 'large'
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                title="Large Cards"
              >
                <Square size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SCREENSHOTS GRID / EMPTY / LOADING STATES                */}
      {/* ========================================================= */}
      {isLoading && galleryScreenshots.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-border bg-card space-y-3">
          <Camera size={36} className="mx-auto text-primary animate-pulse opacity-70" />
          <p className="text-sm font-bold text-foreground">Loading Desktop Screenshots...</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Querying captured desktop frames and verifying storage objects for {startDate}{startDate !== endDate ? ` to ${endDate}` : ''}.
          </p>
        </div>
      ) : filteredScreenshots.length > 0 ? (
        <div className={gridClasses}>
          {filteredScreenshots.map((shot, idx) => {
            const isSelected = selectedIds.has(shot.id)
            const isImageFailed = failedImageIds[shot.id] || !shot.imageUrl

            return (
              <div
                key={shot.id}
                onClick={() => setLightboxIndex(idx)}
                className={`group relative rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/40 bg-primary/[0.02]'
                    : 'border-border hover:border-foreground/30'
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-video w-full bg-black/40 overflow-hidden shrink-0">
                  {!isImageFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.imageUrl}
                      alt={shot.windowTitle || `Screenshot taken at ${shot.capturedAtFormatted}`}
                      loading="lazy"
                      onError={() => setFailedImageIds(prev => ({ ...prev, [shot.id]: true }))}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-muted/60 text-center">
                      <Monitor size={32} className="text-muted-foreground/60 mb-2" />
                      <span className="text-xs font-semibold text-foreground line-clamp-1">{shot.appName}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{shot.windowTitle || 'Desktop telemetry frame'}</span>
                    </div>
                  )}

                  {/* Gradient Overlay for controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 p-2.5 flex flex-col justify-between pointer-events-none">
                    {/* Top Bar: Checkbox + Time on Left, App Badge + Individual Delete on Right */}
                    <div className="flex items-center justify-between gap-1.5 pointer-events-auto">
                      {/* Left: Checkbox & Time */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelect(shot.id)
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80'
                          }`}
                          title={isSelected ? 'Deselect screenshot' : 'Select screenshot'}
                        >
                          {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                        </button>

                        <span className="flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/75 text-white backdrop-blur-sm border border-white/10 shadow-sm">
                          <Clock size={10} />
                          {shot.capturedAtFormatted}
                        </span>
                      </div>

                      {/* Right: App Badge & Delete Button */}
                      <div className="flex items-center gap-1">
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/75 text-white backdrop-blur-sm border border-white/10 truncate max-w-[120px] shadow-sm">
                          <Laptop size={10} className="shrink-0" />
                          <span className="truncate">{shot.appName}</span>
                        </span>

                        {/* Individual Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSingle(shot.id, `${shot.appName} - ${shot.capturedAtFormatted}`)
                          }}
                          className="p-1 rounded-md bg-black/60 text-destructive/80 hover:text-destructive hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete this screenshot"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Hover Center Overlay: Maximize Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px] pointer-events-auto">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/95 text-foreground text-xs font-semibold shadow-lg border border-border scale-95 group-hover:scale-100 transition-transform">
                        <Maximize2 size={13} />
                        <span>View Full Size</span>
                      </span>
                    </div>

                    {/* Bottom Bar: File Size / Employee Name (if in global view) */}
                    <div className="flex items-center justify-between text-[10px] text-white/90">
                      {shot.employeeName && !employeeName ? (
                        <span className="flex items-center gap-1 font-semibold truncate max-w-[130px] bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          <User size={10} />
                          <span className="truncate">{shot.employeeName}</span>
                        </span>
                      ) : (
                        <span />
                      )}

                      {shot.fileSizeFormatted && (
                        <span className="font-mono text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white/80 backdrop-blur-xs">
                          {shot.fileSizeFormatted}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Window Title & Date */}
                <div className="p-3 bg-card flex-1 flex flex-col justify-between border-t border-border/60">
                  <p
                    className="text-xs font-medium text-foreground line-clamp-2"
                    title={shot.windowTitle || shot.appName}
                  >
                    {shot.windowTitle || 'No window title recorded'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 mt-auto border-t border-border/30">
                    <span className="font-mono truncate">{shot.sessionDate}</span>
                    <span className="text-primary group-hover:underline font-semibold text-[11px] flex items-center gap-0.5">
                      Preview
                      <Maximize2 size={10} />
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Camera size={32} className="opacity-50" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-base font-bold text-foreground">
              No Screenshots Found
            </h4>
            <p className="text-xs text-muted-foreground">
              {galleryScreenshots.length === 0
                ? `No desktop screenshots were recorded for ${employeeName || 'the selected staff'} between ${startDate} and ${endDate}.`
                : 'No screenshots matched your active filters. Try broadening the search query, application filter, or time range.'}
            </p>
          </div>

          {(startTime || endTime) && (
            <button
              type="button"
              onClick={() => applyTimePreset('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-sm"
            >
              <X size={12} />
              <span>Clear Time Filter ({startTime || '00:00'} - {endTime || '23:59'})</span>
            </button>
          )}

          {initialScreenshots && initialScreenshots.length === 0 && (
            <div className="p-3.5 max-w-lg mx-auto rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground text-left space-y-1 mt-3">
              <span className="font-semibold text-foreground block">How do screenshots work?</span>
              <p>
                The TripleS Time Tracker desktop application captures silent activity screenshots periodically
                when employees have an active working session clocked in.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX MODAL                                            */}
      {/* ========================================================= */}
      {lightboxIndex !== null && (
        <ScreenshotLightboxModal
          screenshots={filteredScreenshots}
          initialIndex={lightboxIndex}
          employeeName={employeeName}
          onClose={() => setLightboxIndex(null)}
          onDeleteScreenshot={handleLightboxDelete}
        />
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION DIALOG                                */}
      {/* ========================================================= */}
      {deleteModal.isOpen && (
        <DeleteScreenshotConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, type: 'single', count: 0 })}
          onConfirm={handleConfirmDelete}
          itemCount={deleteModal.count}
          isDeleting={isDeleting}
          screenshotTitle={deleteModal.title}
        />
      )}
    </div>
  )
}
