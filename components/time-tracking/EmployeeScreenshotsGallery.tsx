'use client'

import React, { useState, useMemo } from 'react'
import {
  Camera,
  Laptop,
  Clock,
  Search,
  Filter,
  HardDrive,
  Calendar,
  Maximize2,
  ExternalLink,
  Download,
  Grid3X3,
  LayoutGrid,
  X,
  Layers,
  ArrowUpDown,
  User
} from 'lucide-react'
import type { ScreenshotItem } from '@/lib/actions/time-tracking'
import { ScreenshotLightboxModal } from './ScreenshotLightboxModal'

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
}

export function EmployeeScreenshotsGallery({
  screenshots,
  employeeName,
  selectedDate,
  onDateChange,
  availableEmployees,
  selectedEmployeeId,
  onEmployeeChange,
  sessions = [],
  isLoading = false
}: EmployeeScreenshotsGalleryProps) {
  // Filter States
  const [selectedSessionId, setSelectedSessionId] = useState<string>('All')
  const [selectedApp, setSelectedApp] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [gridDensity, setGridDensity] = useState<'compact' | 'normal' | 'large'>('normal')

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Unique applications detected in current screenshots
  const uniqueApps = useMemo(() => {
    const apps = new Set<string>()
    for (const s of screenshots) {
      if (s.appName) apps.add(s.appName)
    }
    return Array.from(apps).sort()
  }, [screenshots])

  // Unique sessions detected
  const uniqueSessions = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of screenshots) {
      if (!map.has(s.sessionId)) {
        map.set(s.sessionId, s.sessionId)
      }
    }
    return Array.from(map.keys())
  }, [screenshots])

  // Filter and sort screenshots
  const filteredScreenshots = useMemo(() => {
    return screenshots
      .filter((s) => {
        // Filter by Session
        if (selectedSessionId !== 'All' && s.sessionId !== selectedSessionId) {
          return false
        }
        // Filter by Application
        if (selectedApp !== 'All' && s.appName.toLowerCase() !== selectedApp.toLowerCase()) {
          return false
        }
        // Filter by Search Query (window title or app name or employee name)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchesTitle = s.windowTitle?.toLowerCase().includes(q)
          const matchesApp = s.appName?.toLowerCase().includes(q)
          const matchesEmp = s.employeeName?.toLowerCase().includes(q)
          if (!matchesTitle && !matchesApp && !matchesEmp) return false
        }
        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.capturedAt).getTime()
        const timeB = new Date(b.capturedAt).getTime()
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
      })
  }, [screenshots, selectedSessionId, selectedApp, searchQuery, sortOrder])

  // Grid styling based on density
  const gridClasses = useMemo(() => {
    switch (gridDensity) {
      case 'compact':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'
      case 'large':
        return 'grid grid-cols-1 md:grid-cols-2 gap-6'
      case 'normal':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    }
  }, [gridDensity])

  return (
    <div className="space-y-5">
      {/* Controls & Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-primary" />
              <h3 className="text-base font-bold text-foreground">
                Desktop Screen Captures {employeeName ? `for ${employeeName}` : ''}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                {filteredScreenshots.length} {filteredScreenshots.length === 1 ? 'screenshot' : 'screenshots'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified desktop activity screenshots recorded during active work sessions on {selectedDate}.
            </p>
          </div>

          {/* Quick Stats on right */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {uniqueApps.length > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/40 border border-border">
                <Laptop size={13} />
                <span>{uniqueApps.length} Apps Detected</span>
              </span>
            )}
            {uniqueSessions.length > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/40 border border-border">
                <Layers size={13} />
                <span>{uniqueSessions.length} {uniqueSessions.length === 1 ? 'Session' : 'Sessions'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Date Picker (if change handler provided) */}
          {onDateChange && (
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Calendar size={13} className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="text-xs font-medium pl-8 pr-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
                />
              </div>
            </div>
          )}

          {/* Employee Selector (if provided) */}
          {availableEmployees && onEmployeeChange && (
            <div className="relative min-w-[170px]">
              <select
                value={selectedEmployeeId || 'All'}
                onChange={(e) => onEmployeeChange(e.target.value)}
                className="w-full text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
              >
                <option value="All">All Staff ({availableEmployees.length})</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {typeof emp.count === 'number' ? `(${emp.count})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Session Selector */}
          {uniqueSessions.length > 1 && (
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
            >
              <option value="All">All Sessions ({uniqueSessions.length})</option>
              {uniqueSessions.map((sid, idx) => (
                <option key={sid} value={sid}>
                  Session #{idx + 1} ({sid.slice(0, 8)}...)
                </option>
              ))}
            </select>
          )}

          {/* App Selector */}
          {uniqueApps.length > 0 && (
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-card text-foreground outline-none cursor-pointer hover:border-foreground/30 focus:border-foreground shadow-sm transition-colors"
            >
              <option value="All">All Apps ({uniqueApps.length})</option>
              {uniqueApps.map((app) => (
                <option key={app} value={app}>
                  {app}
                </option>
              ))}
            </select>
          )}

          {/* Search by Window Title */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search window title, app, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-sm"
            title={`Sort by time: currently ${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}`}
          >
            <ArrowUpDown size={13} />
            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>

          {/* Grid density toggle */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5 shadow-sm">
            <button
              onClick={() => setGridDensity('compact')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${gridDensity === 'compact'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              title="Compact View"
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => setGridDensity('normal')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${gridDensity === 'normal'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              title="Standard View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid or Loading / Empty States */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl border border-border bg-card">
          <Camera size={36} className="mx-auto mb-3 animate-pulse text-muted-foreground opacity-50" />
          <p className="text-sm font-semibold text-foreground">Loading employee screenshots...</p>
          <p className="text-xs text-muted-foreground mt-1">Retrieving captured desktop frames from cloud storage.</p>
        </div>
      ) : filteredScreenshots.length > 0 ? (
        <div className={gridClasses}>
          {filteredScreenshots.map((shot, idx) => (
            <div
              key={shot.id}
              onClick={() => setLightboxIndex(idx)}
              className="group relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-foreground/30 transition-all cursor-pointer flex flex-col"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-video w-full bg-black/30 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shot.imageUrl}
                  alt={shot.windowTitle || `Screenshot taken at ${shot.capturedAtFormatted}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Overlay Badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 p-2.5 flex flex-col justify-between pointer-events-none">
                  {/* Top Bar: Time & App Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-sm border border-white/10 shadow-sm">
                      <Clock size={10} />
                      {shot.capturedAtFormatted}
                    </span>

                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-sm border border-white/10 truncate max-w-[140px] shadow-sm">
                      <Laptop size={10} className="shrink-0" />
                      <span className="truncate">{shot.appName}</span>
                    </span>
                  </div>

                  {/* Hover Center Overlay: Maximize Icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px]">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/90 text-foreground text-xs font-semibold shadow-lg border border-border scale-95 group-hover:scale-100 transition-transform">
                      <Maximize2 size={13} />
                      <span>View Full Size</span>
                    </span>
                  </div>

                  {/* Bottom Bar: File Size / Employee Name (if in global view) */}
                  <div className="flex items-center justify-between text-[10px] text-white/90">
                    {shot.employeeName && !employeeName ? (
                      <span className="flex items-center gap-1 font-semibold truncate max-w-[130px]">
                        <User size={10} />
                        <span className="truncate">{shot.employeeName}</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {shot.fileSizeFormatted && (
                      <span className="font-mono text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white/80">
                        {shot.fileSizeFormatted}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer: Window Title */}
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
          ))}
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
              {screenshots.length === 0
                ? `No desktop screenshots were recorded for ${employeeName || 'the selected employee(s)'} on ${selectedDate}.`
                : 'No screenshots matched your current filter criteria. Try adjusting the search query or application filter.'}
            </p>
          </div>

          {screenshots.length === 0 && (
            <div className="p-3 max-w-lg mx-auto rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground text-left space-y-1">
              <span className="font-semibold text-foreground block">How do screenshots work?</span>
              <p>
                The TripleS Time Tracker desktop application captures silent activity screenshots periodically
                when employees have an active working session clocked in.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <ScreenshotLightboxModal
          screenshots={filteredScreenshots}
          initialIndex={lightboxIndex}
          employeeName={employeeName}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}

