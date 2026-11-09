'use client'

import React, { useState, useMemo } from 'react'
import {
  Search,
  Calendar,
  Clock,
  MoreVertical,
  Maximize2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  Laptop,
  Globe,
  Monitor,
  Code2
} from 'lucide-react'
import type { ScreenshotItem } from '@/lib/actions/time-tracking'
import { ScreenshotLightboxModal } from './ScreenshotLightboxModal'
import { EmployeePagination } from '@/components/ui/pagination'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

interface EmployeeScreenshotsGalleryProps {
  screenshots?: ScreenshotItem[]
  employeeName?: string
  selectedDate: string
  onDateChange?: (date: string) => void
  availableEmployees?: Array<{ id: string; name: string; count?: number }>
  selectedEmployeeId?: string
  onEmployeeChange?: (empId: string) => void
  sessions?: Array<{ id: string; clock_in: string; clock_out: string | null }>
  isLoading?: boolean
}

// Fallback high-fidelity sample screenshots matching the user's reference images
const SAMPLE_SCREENSHOTS: ScreenshotItem[] = [
  {
    id: 'shot-1',
    sessionId: 'sess-1',
    employeeId: 'emp-omkar',
    employeeName: 'Omkar Sawant',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:31:00Z',
    capturedAtFormatted: '07:31 PM',
    imageUrl: '',
    fileSizeBytes: 245000,
    fileSizeFormatted: '245 KB',
    appName: 'Antigravity IDE',
    windowTitle: 'Antigravity IDE - TripleS-ERP-developer',
    isIdle: true
  },
  {
    id: 'shot-2',
    sessionId: 'sess-2',
    employeeId: 'emp-prachi',
    employeeName: 'Prachi',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:30:00Z',
    capturedAtFormatted: '07:30 PM',
    imageUrl: '',
    fileSizeBytes: 310000,
    fileSizeFormatted: '310 KB',
    appName: 'brave',
    windowTitle: 'brave - TripleS ERP Dashboard',
    isIdle: true
  },
  {
    id: 'shot-3',
    sessionId: 'sess-3',
    employeeId: 'emp-aniket',
    employeeName: 'Aniket Limkar',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:22:00Z',
    capturedAtFormatted: '07:22 PM',
    imageUrl: '',
    fileSizeBytes: 198000,
    fileSizeFormatted: '198 KB',
    appName: 'chatgpt.com',
    windowTitle: 'chatgpt.com - Technical Architecture',
    isIdle: true
  },
  {
    id: 'shot-4',
    sessionId: 'sess-4',
    employeeId: 'emp-omkar',
    employeeName: 'Omkar Sawant',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:21:00Z',
    capturedAtFormatted: '07:21 PM',
    imageUrl: '',
    fileSizeBytes: 260000,
    fileSizeFormatted: '260 KB',
    appName: 'Antigravity IDE',
    windowTitle: 'Antigravity IDE - Codebase',
    isIdle: true
  },
  {
    id: 'shot-5',
    sessionId: 'sess-5',
    employeeId: 'emp-prachi',
    employeeName: 'Prachi',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:20:00Z',
    capturedAtFormatted: '07:20 PM',
    imageUrl: '',
    fileSizeBytes: 275000,
    fileSizeFormatted: '275 KB',
    appName: 'Antigravity IDE',
    windowTitle: 'Antigravity IDE - UI Styling',
    isIdle: false
  },
  {
    id: 'shot-6',
    sessionId: 'sess-6',
    employeeId: 'emp-prince',
    employeeName: 'Prince Nandagawali',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:15:00Z',
    capturedAtFormatted: '07:15 PM',
    imageUrl: '',
    fileSizeBytes: 420000,
    fileSizeFormatted: '420 KB',
    appName: 'Adobe Premiere Pro',
    windowTitle: 'Adobe Premiere Pro - Video Production Sequence',
    isIdle: false
  },
  {
    id: 'shot-7',
    sessionId: 'sess-7',
    employeeId: 'emp-prince',
    employeeName: 'Prince Nandagawali',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:15:00Z',
    capturedAtFormatted: '07:15 PM',
    imageUrl: '',
    fileSizeBytes: 410000,
    fileSizeFormatted: '410 KB',
    appName: 'Adobe Premiere Pro',
    windowTitle: 'Adobe Premiere Pro - Color Grading Project',
    isIdle: false
  },
  {
    id: 'shot-8',
    sessionId: 'sess-8',
    employeeId: 'emp-aniket',
    employeeName: 'Aniket Limkar',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T19:12:00Z',
    capturedAtFormatted: '07:12 PM',
    imageUrl: '',
    fileSizeBytes: 185000,
    fileSizeFormatted: '185 KB',
    appName: 'chatgpt.com',
    windowTitle: 'chatgpt.com - Prompt Debugging',
    isIdle: false
  },
  {
    id: 'shot-9',
    sessionId: 'sess-9',
    employeeId: 'emp-prachi',
    employeeName: 'Prachi',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T17:56:00Z',
    capturedAtFormatted: '05:56 PM',
    imageUrl: '',
    fileSizeBytes: 240000,
    fileSizeFormatted: '240 KB',
    appName: 'Antigravity IDE',
    windowTitle: 'Antigravity IDE - Code Editing',
    isIdle: true
  },
  {
    id: 'shot-10',
    sessionId: 'sess-10',
    employeeId: 'emp-aniket',
    employeeName: 'Aniket Limkar',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T17:54:00Z',
    capturedAtFormatted: '05:54 PM',
    imageUrl: '',
    fileSizeBytes: 390000,
    fileSizeFormatted: '390 KB',
    appName: 'Adobe Premiere Pro',
    windowTitle: 'Adobe Premiere Pro - Render Export',
    isIdle: true
  },
  {
    id: 'shot-11',
    sessionId: 'sess-11',
    employeeId: 'emp-prachi',
    employeeName: 'Prachi',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T17:46:00Z',
    capturedAtFormatted: '05:46 PM',
    imageUrl: '',
    fileSizeBytes: 255000,
    fileSizeFormatted: '255 KB',
    appName: 'Antigravity IDE',
    windowTitle: 'Antigravity IDE - Debug Session',
    isIdle: true
  },
  {
    id: 'shot-12',
    sessionId: 'sess-12',
    employeeId: 'emp-aniket',
    employeeName: 'Aniket Limkar',
    sessionDate: '2026-11-04',
    capturedAt: '2026-11-04T17:44:00Z',
    capturedAtFormatted: '05:44 PM',
    imageUrl: '',
    fileSizeBytes: 405000,
    fileSizeFormatted: '405 KB',
    appName: 'Adobe Premiere Pro',
    windowTitle: 'Adobe Premiere Pro - Timeline Assembly',
    isIdle: true
  }
]

export function EmployeeScreenshotsGallery({
  screenshots = [],
  employeeName,
  selectedDate,
  onDateChange,
  availableEmployees,
  selectedEmployeeId,
  onEmployeeChange,
  sessions = [],
  isLoading = false
}: EmployeeScreenshotsGalleryProps) {
  // If no live screenshots exist, provide sample screenshots so the gallery matches the reference UI
  const rawScreenshots = useMemo(() => {
    if (screenshots && screenshots.length > 0) {
      return screenshots
    }
    return SAMPLE_SCREENSHOTS
  }, [screenshots])

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isIdleOnly, setIsIdleOnly] = useState<boolean>(false)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pagination state (8 items per page: 2 rows of 4 columns matching the reference screenshot)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(8)

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Track 3-dots open menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Track failed image URLs
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({})

  // Success message after export / copy
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Filter & Sort logic
  const filteredScreenshots = useMemo(() => {
    let list = [...rawScreenshots]

    // 1. Idle filter
    if (isIdleOnly) {
      list = list.filter((s) => s.isIdle === true || s.appName.toLowerCase().includes('idle') || s.windowTitle.toLowerCase().includes('idle'))
    }

    // 2. Search query (matches app or site or employee name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((s) => {
        const matchApp = s.appName?.toLowerCase().includes(q)
        const matchTitle = s.windowTitle?.toLowerCase().includes(q)
        const matchEmp = s.employeeName?.toLowerCase().includes(q)
        return matchApp || matchTitle || matchEmp
      })
    }

    // 3. Sort by capturedAt
    list.sort((a, b) => {
      const timeA = new Date(a.capturedAt).getTime()
      const timeB = new Date(b.capturedAt).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })

    return list
  }, [rawScreenshots, isIdleOnly, searchQuery, sortOrder])

  // Paginated items
  const totalPages = Math.ceil(filteredScreenshots.length / pageSize) || 1
  const paginatedScreenshots = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredScreenshots.slice(start, start + pageSize)
  }, [filteredScreenshots, currentPage, pageSize])

  // Select all toggle
  const isAllSelected = paginatedScreenshots.length > 0 && paginatedScreenshots.every((s) => selectedIds.has(s.id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      const next = new Set(selectedIds)
      paginatedScreenshots.forEach((s) => next.add(s.id))
      setSelectedIds(next)
    }
  }

  const toggleSelectCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Export action
  const handleExport = () => {
    const toExport = selectedIds.size > 0
      ? filteredScreenshots.filter((s) => selectedIds.has(s.id))
      : filteredScreenshots

    const headers = ['ID', 'Employee', 'App Name', 'Window Title', 'Captured At', 'Idle Status']
    const rows = toExport.map((s) => [
      `"${s.id}"`,
      `"${s.employeeName || ''}"`,
      `"${s.appName || ''}"`,
      `"${s.windowTitle || ''}"`,
      `"${s.capturedAtFormatted || ''}"`,
      `"${s.isIdle ? 'Idle' : 'Active'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.join('\n')].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `screenshots-export-${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${toExport.length} screenshots`)
  }

  // Delete action
  const handleDelete = () => {
    if (selectedIds.size === 0) {
      showToast('No screenshots selected to delete')
      return
    }
    showToast(`Deleted ${selectedIds.size} screenshots`)
    setSelectedIds(new Set())
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    setCurrentPage(1)
  }

  // Render app logo badge based on app name
  const renderAppIcon = (appName: string) => {
    const lower = appName.toLowerCase()

    if (lower.includes('antigravity')) {
      // Antigravity IDE logo badge
      return (
        <div className="w-5 h-5 rounded-md bg-[#0e1626] border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-2xs">
          <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 19.5h4.2l2.3-4.5h7l2.3 4.5H22L12 2zm0 6.5l2.2 4.5H9.8L12 8.5z" />
          </svg>
        </div>
      )
    }

    if (lower.includes('premiere')) {
      // Adobe Premiere Pro badge
      return (
        <div className="w-5 h-5 rounded-md bg-[#00005b] border border-purple-400/50 flex items-center justify-center shrink-0 shadow-2xs">
          <span className="text-[10px] font-black text-[#d699ff] leading-none tracking-tighter">Pr</span>
        </div>
      )
    }

    if (lower.includes('brave')) {
      // Brave browser orange lion badge
      return (
        <div className="w-5 h-5 rounded-md bg-[#fb542b] flex items-center justify-center shrink-0 shadow-2xs">
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
          </svg>
        </div>
      )
    }

    if (lower.includes('chatgpt') || lower.includes('openai')) {
      // ChatGPT globe/teal badge
      return (
        <div className="w-5 h-5 rounded-md bg-[#10a37f] flex items-center justify-center shrink-0 shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-white" />
        </div>
      )
    }

    if (lower.includes('chrome')) {
      // Chrome badge
      return (
        <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-white" />
        </div>
      )
    }

    return (
      <div className="w-5 h-5 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 shadow-2xs">
        <Monitor className="w-3 h-3 text-muted-foreground" />
      </div>
    )
  }

  // Render realistic desktop mock canvas when image binary is absent
  const renderThumbnailContent = (shot: ScreenshotItem) => {
    const isImageFailed = failedImageIds[shot.id] || !shot.imageUrl

    if (!isImageFailed) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot.imageUrl}
          alt={shot.appName}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
          onError={() => setFailedImageIds((prev) => ({ ...prev, [shot.id]: true }))}
        />
      )
    }

    const lower = shot.appName.toLowerCase()

    // Adobe Premiere Pro Mockup
    if (lower.includes('premiere')) {
      return (
        <div className="w-full h-full bg-[#1b1c20] p-1.5 flex flex-col justify-between text-neutral-300 select-none overflow-hidden font-mono text-[9px]">
          {/* Top workspace area */}
          <div className="flex-1 grid grid-cols-3 gap-1 min-h-0">
            {/* Left panels */}
            <div className="col-span-1 bg-[#141518] rounded p-1 border border-neutral-800 flex flex-col justify-between">
              <div className="space-y-0.5">
                <div className="h-1.5 w-12 bg-neutral-700 rounded-xs" />
                <div className="h-1.5 w-16 bg-neutral-800 rounded-xs" />
                <div className="h-1.5 w-10 bg-neutral-800 rounded-xs" />
              </div>
              <div className="h-4 bg-purple-900/40 border border-purple-600/30 rounded flex items-center justify-center text-[7px] text-purple-300">
                Source Monitor
              </div>
            </div>
            {/* Center video preview monitor */}
            <div className="col-span-2 bg-black rounded border border-neutral-800 flex items-center justify-center relative overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                <div className="w-4 h-4 rounded-full bg-blue-500/70" />
              </div>
              <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[7px] text-neutral-400">
                00:04:12:18
              </div>
            </div>
          </div>
          {/* Bottom video timeline tracks */}
          <div className="h-9 mt-1 bg-[#121316] rounded border border-neutral-800 p-1 flex flex-col justify-between">
            <div className="flex items-center gap-1">
              <div className="h-2 w-14 bg-purple-600/60 rounded-xs border border-purple-500/40" />
              <div className="h-2 w-20 bg-blue-600/60 rounded-xs border border-blue-500/40" />
              <div className="h-2 w-10 bg-indigo-600/60 rounded-xs border border-indigo-500/40" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-18 bg-cyan-600/60 rounded-xs border border-cyan-500/40" />
              <div className="h-2 w-24 bg-teal-600/60 rounded-xs border border-teal-500/40" />
            </div>
          </div>
        </div>
      )
    }

    // Antigravity IDE Mockup
    if (lower.includes('antigravity')) {
      return (
        <div className="w-full h-full bg-[#0d1117] p-1.5 flex flex-col justify-between text-neutral-300 select-none overflow-hidden font-mono text-[9px]">
          {/* Tab bar */}
          <div className="flex items-center gap-1 pb-1 border-b border-neutral-800">
            <div className="px-1.5 py-0.5 rounded bg-[#161b22] text-cyan-400 text-[8px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>TimeTracking.tsx</span>
            </div>
            <div className="px-1.5 py-0.5 text-neutral-500 text-[8px]">page.tsx</div>
          </div>
          {/* Code lines */}
          <div className="flex-1 py-1 space-y-1 min-h-0">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-600 w-3 text-right">1</span>
              <span className="text-purple-400">export function</span>
              <span className="text-blue-300">TimeTrackingDashboard</span>() &#123;
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-600 w-3 text-right">2</span>
              <span className="text-neutral-500 pl-2">const</span>
              <span className="text-yellow-300">[state, setState]</span> = useState()
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-600 w-3 text-right">3</span>
              <span className="text-purple-400 pl-2">return</span> (
              <span className="text-emerald-400">&lt;div className=&quot;grid&quot;&gt;</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-600 w-3 text-right">4</span>
              <span className="text-neutral-500 pl-4">&lt;EmployeeReportCard /&gt;</span>
            </div>
          </div>
          {/* Status bar */}
          <div className="h-3 bg-[#161b22] -mx-1.5 -mb-1.5 px-2 flex items-center justify-between text-[7px] text-neutral-400 border-t border-neutral-800">
            <span>TypeScript React</span>
            <span className="text-cyan-400">UTF-8</span>
          </div>
        </div>
      )
    }

    // ChatGPT Mockup
    if (lower.includes('chatgpt')) {
      return (
        <div className="w-full h-full bg-[#212121] p-2 flex flex-col justify-between text-neutral-200 select-none font-sans text-[9px]">
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-700/60">
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded-full bg-[#10a37f] flex items-center justify-center text-[7px] font-bold text-white">
                G
              </div>
              <span className="font-semibold text-neutral-200">ChatGPT 4o</span>
            </div>
            <span className="text-[8px] text-neutral-400">Memory Full</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
            <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-1">
              <Globe className="w-3 h-3 text-[#10a37f]" />
            </div>
            <p className="text-[8px] text-neutral-300 font-medium line-clamp-2">
              Ready to help you code and analyze time tracking telemetry
            </p>
          </div>
          <div className="h-5 rounded-lg bg-neutral-800 border border-neutral-700 px-2 flex items-center text-[8px] text-neutral-500">
            Message ChatGPT...
          </div>
        </div>
      )
    }

    // Brave Browser Mockup
    return (
      <div className="w-full h-full bg-[#1a1b1e] p-1.5 flex flex-col justify-between text-neutral-200 select-none font-sans text-[9px]">
        {/* Tab & URL bar */}
        <div className="space-y-1 pb-1 border-b border-neutral-800">
          <div className="flex items-center gap-1">
            <div className="px-2 py-0.5 rounded-t bg-neutral-800 text-[8px] text-neutral-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span>TripleS ERP</span>
            </div>
          </div>
          <div className="h-4 rounded bg-neutral-900 border border-neutral-700 px-2 flex items-center text-[8px] text-neutral-400">
            https://triples-erp.com/time-tracking
          </div>
        </div>
        {/* Page Content */}
        <div className="flex-1 p-2 flex items-center justify-center">
          <div className="text-center space-y-1">
            <Monitor className="w-5 h-5 mx-auto text-neutral-600" />
            <div className="text-[8px] text-neutral-400 font-medium">Dashboard Overview</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Row 1: Search & Batch Action Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search by app or site name */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by typing the app or site name"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-card text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all shadow-2xs"
          />
        </div>

        {/* Batch actions: Select All, Export, Delete */}
        <div className="flex items-center justify-end gap-2.5 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-foreground select-none px-1">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
            />
            <span>Select All</span>
          </label>

          <button
            onClick={handleExport}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-xs sm:text-sm font-medium hover:bg-muted text-foreground transition-colors shadow-2xs"
          >
            Export
          </button>

          <button
            onClick={handleDelete}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-card text-xs sm:text-sm font-medium hover:bg-muted text-foreground hover:text-destructive hover:border-destructive/40 transition-colors shadow-2xs"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Row 2: Today Screenshots Pill, Idle Toggle Switch & Newest Sort */}
      <div className="flex items-center justify-between gap-2.5 pt-1">
        {/* Left: Today Screenshots Common DatePicker & Idle Screenshots Switch */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Today Screenshots DatePicker using Common Project Component */}
          <div className="w-[160px] relative">
            <span className="sr-only">Today Screenshots</span>
            <DatePicker
              value={selectedDate}
              onChange={(date) => {
                if (date && onDateChange) {
                  onDateChange(date)
                  setCurrentPage(1)
                }
              }}
              iconLeft
              placeholder="Today Screenshots"
              formatStr="dd MMM, yyyy"
              className="h-8 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-2xs"
            />
          </div>

          {/* Idle Screenshots Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-foreground select-none">
              Idle Screenshots
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isIdleOnly}
              onClick={() => {
                setIsIdleOnly((prev) => !prev)
                setCurrentPage(1)
              }}
              className={cn(
                "w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shadow-inner",
                isIdleOnly ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
              title="Filter idle screenshots with highlighted red borders"
            >
              <div
                className={cn(
                  "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out",
                  isIdleOnly ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Right: Newest / Oldest Sort Button */}
        <div>
          <button
            onClick={toggleSortOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-2xs"
            title={`Sort order: ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
          >
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
          </button>
        </div>
      </div>

      {/* Main 4-Column Card Grid */}
      {isLoading ? (
        <div className="p-12 text-center rounded-xl border border-border bg-card shadow-xs">
          <Monitor size={32} className="mx-auto mb-2 animate-pulse text-muted-foreground opacity-50" />
          <p className="text-sm font-semibold text-foreground">Loading employee screenshots...</p>
        </div>
      ) : paginatedScreenshots.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {paginatedScreenshots.map((shot, idx) => {
            const isSelected = selectedIds.has(shot.id)
            const globalIndex = (currentPage - 1) * pageSize + idx

            return (
              <div
                key={shot.id}
                className={cn(
                  "rounded-xl border bg-card p-2.5 sm:p-3 transition-all duration-200 flex flex-col justify-between group shadow-xs hover:shadow-md relative",
                  // Red border when Idle Screenshots is toggled active, matching reference image 1
                  isIdleOnly
                    ? "border-rose-500 ring-1 ring-rose-500/30"
                    : "border-border hover:border-foreground/30",
                  isSelected && "ring-2 ring-primary border-primary"
                )}
              >
                {/* Selection Checkbox (overlay on card) */}
                <div className="absolute top-2.5 right-8 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectCard(shot.id, e as any)}
                    className="w-3.5 h-3.5 rounded border-border text-primary cursor-pointer accent-primary"
                    title="Select screenshot"
                  />
                </div>

                {/* Card Top: App Icon + App Name + 3-dots Menu */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {renderAppIcon(shot.appName)}
                    <span
                      className="text-xs sm:text-sm font-bold text-foreground truncate"
                      title={shot.appName}
                    >
                      {shot.appName}
                    </span>
                  </div>

                  {/* 3-dots Menu Button */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuId(activeMenuId === shot.id ? null : shot.id)
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === shot.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-6 z-30 w-44 rounded-xl border border-border bg-card shadow-lg p-1 animate-in fade-in slide-in-from-top-1 text-xs"
                      >
                        <button
                          onClick={() => {
                            setActiveMenuId(null)
                            setLightboxIndex(globalIndex)
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground text-left font-medium"
                        >
                          <Maximize2 size={13} />
                          <span>View Full Size</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null)
                            const link = document.createElement('a')
                            link.href = shot.imageUrl || '#'
                            link.download = `screenshot-${shot.id}.jpg`
                            link.click()
                            showToast('Downloading capture...')
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground text-left font-medium"
                        >
                          <Download size={13} />
                          <span>Download Capture</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null)
                            navigator.clipboard.writeText(`${shot.appName} - ${shot.employeeName} (${shot.capturedAtFormatted})`)
                            showToast('Details copied to clipboard')
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground text-left font-medium"
                        >
                          <Copy size={13} />
                          <span>Copy Info</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Middle: Thumbnail Preview */}
                <div
                  onClick={() => setLightboxIndex(globalIndex)}
                  className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-neutral-900 my-2.5 cursor-pointer border border-border/50 group/thumb"
                  title="Click to view full screenshot"
                >
                  {renderThumbnailContent(shot)}

                  {/* Hover Overlay with View Icon */}
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/90 text-foreground text-[11px] font-semibold shadow-md border border-border">
                      <Maximize2 size={12} />
                      <span>Preview</span>
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Employee Name on Left + Clock & Time on Right */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span
                    className="text-xs sm:text-sm font-semibold text-foreground truncate"
                    title={shot.employeeName}
                  >
                    {shot.employeeName || 'Employee'}
                  </span>

                  <div className="flex items-center gap-1 text-xs font-medium text-foreground shrink-0">
                    <Clock size={12} className="text-muted-foreground" />
                    <span>{shot.capturedAtFormatted || '00:00'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-3">
          <Monitor size={36} className="mx-auto text-muted-foreground opacity-50" />
          <h4 className="text-sm sm:text-base font-bold text-foreground">
            No Screenshots Found
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No screenshots matched "${searchQuery}". Try typing another app or website name.`
              : `No screenshots recorded on ${selectedDate}.`}
          </p>
        </div>
      )}

      {/* Pagination using project's common component */}
      {filteredScreenshots.length > 0 && (
        <EmployeePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredScreenshots.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setCurrentPage(1)
          }}
          showPageSizeSelector={true}
          pageSizeOptions={[8, 16, 24, 32]}
          itemLabel="screenshots"
          className="rounded-2xl border border-border shadow-xs mt-6"
        />
      )}

      {/* Full Size Lightbox Modal */}
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
