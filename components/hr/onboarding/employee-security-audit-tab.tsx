'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Laptop,
  Smartphone,
  Tablet,
  Search,
  RotateCcw,
  Clock,
  MapPin,
  Globe,
  Key,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Ban,
  Loader2,
  Info,
  Calendar,
  Lock,
  Radio,
  Copy,
  Check
} from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import {
  getEmployeeAuditLogs,
  revokeSessionAction,
  SecurityAuditResponse
} from '@/lib/actions/security-audit'
import { SecurityAuditRecord } from '@/lib/utils/audit-logger'
import { formatToKolkataTime, classifyIp, getIpVersion, IpClassification } from '@/lib/utils/device-parser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface EmployeeSecurityAuditTabProps {
  employee: Employee
}

export function EmployeeSecurityAuditTab({ employee }: EmployeeSecurityAuditTabProps) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SecurityAuditResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'suspicious'>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search query to prevent unnecessary queries on every key press
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Details Modal
  const [selectedRecord, setSelectedRecord] = useState<SecurityAuditRecord | null>(null)

  // Copy to clipboard state
  const [copiedIpId, setCopiedIpId] = useState<string | null>(null)
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null)
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string, type: 'ip' | 'event' | 'session') => {
    if (!text || text === '-' || text === 'Unavailable') return
    navigator.clipboard.writeText(text)
    if (type === 'ip') setCopiedIpId(id)
    if (type === 'event') setCopiedEventId(id)
    if (type === 'session') setCopiedSessionId(id)
    toast({
      title: 'Copied to Clipboard',
      description: text,
    })
    setTimeout(() => {
      if (type === 'ip') setCopiedIpId(null)
      if (type === 'event') setCopiedEventId(null)
      if (type === 'session') setCopiedSessionId(null)
    }, 2000)
  }

  // Safe event metadata (sanitize any leftover emails or credentials)
  const sanitizedModalMetadata = useMemo(() => {
    if (!selectedRecord?.metadata) return null
    const meta = { ...selectedRecord.metadata }
    delete (meta as any).email
    delete (meta as any).password
    delete (meta as any).token
    delete (meta as any).access_token
    return Object.keys(meta).length > 0 ? meta : null
  }, [selectedRecord?.metadata])

  // Revoke Dialog
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  // Fetch logs
  const fetchLogs = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getEmployeeAuditLogs(employee.id, {
          search: debouncedSearch,
          status: statusFilter,
          dateRange: dateRangeFilter,
          page: pageToLoad,
          pageSize: 10,
        })
        setData(res)
        setCurrentPage(pageToLoad)
      } catch (err: any) {
        console.error('Error loading audit logs:', err)
        setError(err.message || 'Failed to load security audit records')
      } finally {
        setLoading(false)
      }
    },
    [employee.id, debouncedSearch, statusFilter, dateRangeFilter]
  )

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!data || newPage <= data.totalPages)) {
      fetchLogs(newPage)
    }
  }

  const handleRevokeSession = async () => {
    if (!revokingSessionId) return
    setIsRevoking(true)
    try {
      const res = await revokeSessionAction(revokingSessionId, employee.id)
      if (res.success) {
        toast({
          title: 'Session Revoked',
          description: `Active session ${revokingSessionId} has been successfully terminated.`,
        })
        setRevokingSessionId(null)
        if (selectedRecord?.session_id === revokingSessionId) {
          setSelectedRecord(prev => (prev ? { ...prev, session_status: 'Revoked' } : null))
        }
        fetchLogs(currentPage)
      } else {
        toast({
          title: 'Revocation Failed',
          description: res.message || 'Unable to revoke session.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Unexpected revocation error',
        variant: 'destructive',
      })
    } finally {
      setIsRevoking(false)
    }
  }

  const getDeviceIcon = (deviceType?: string | null, clientType?: string | null) => {
    if (clientType === 'desktop_app') {
      return <Laptop className="w-3.5 h-3.5 text-purple-400" />
    }
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-blue-400" />
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 text-purple-400" />
      default:
        return <Laptop className="w-3.5 h-3.5 text-zinc-300" />
    }
  }

  const getEventBadge = (record: SecurityAuditRecord) => {
    if (record.is_suspicious || record.event_type === 'suspicious_attempt') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
          <AlertTriangle className="w-3 h-3" />
          {record.flag_reason || 'Unusual Activity'}
        </span>
      )
    }

    if (record.status === 'Failed' || record.event_type === 'login_failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
          <XCircle className="w-3 h-3" />
          Failed Login
        </span>
      )
    }

    switch (record.event_type) {
      case 'login_success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" />
            Login Success
          </span>
        )
      case 'logout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Clock className="w-3 h-3" />
            Logged Out
          </span>
        )
      case 'password_change':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/25">
            <Key className="w-3 h-3" />
            Password Change
          </span>
        )
      case 'session_revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <Ban className="w-3 h-3" />
            Session Revoked
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-muted/40 text-muted-foreground border border-border/40">
            {record.event_type.replace('_', ' ')}
          </span>
        )
    }
  }

  const getSessionPill = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Active
          </span>
        )
      case 'Revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ban className="w-2.5 h-2.5" /> Revoked
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Expired
          </span>
        )
    }
  }

  const getIpBadge = (classification?: string, ip?: string | null) => {
    if (!ip) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
          Unavailable
        </span>
      )
    }
    const cls = classification || classifyIp(ip)
    switch (cls) {
      case 'Localhost':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/15 text-zinc-300 border border-zinc-500/25">
            Localhost
          </span>
        )
      case 'Private Network':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
            Private Network
          </span>
        )
      case 'Public IP':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            Public IP
          </span>
        )
      case 'VPN / Proxy':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
            VPN / Proxy
          </span>
        )
      case 'Unavailable':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Unavailable
          </span>
        )
    }
  }

  const formatLocationDisplay = (loc?: string | null, ip?: string | null) => {
    if (!ip) {
      return 'Not captured'
    }
    if (!loc || loc === 'Approximate Location Unavailable' || loc === 'Unknown' || loc === 'Local / Office Network') {
      return 'Not captured'
    }
    return loc
  }

  const getClientDisplay = (record: SecurityAuditRecord) => {
    const isDesktopApp = record.client_type === 'desktop_app' || record.app_name === 'TripleS Time Tracker' || record.browser?.includes('Tracker')
    if (isDesktopApp) {
      const ver = record.app_version || '1.0.0'
      return {
        title: `TripleS Time Tracker v${ver}`,
        subtitle: record.runtime || 'Electron 34.2.0 (Windows)',
        isDesktop: true
      }
    }
    return {
      title: record.browser || 'Web Browser',
      subtitle: record.os || 'Windows 11 / 10',
      isDesktop: false
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Banner / Context Card */}
      <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-foreground leading-tight">
                Login & Security Audit Trail
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Session monitoring, device verification, and append-only authentication logs for{' '}
                <span className="text-foreground font-semibold">
                  {employee.first_name} {employee.last_name}
                </span>{' '}
                ({employee.employee_id_number || 'N/A'}).
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchLogs(currentPage)}
            disabled={loading}
            className="h-8 text-xs gap-1.5 shrink-0 bg-card/60 dark:bg-zinc-900/60"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Attempts */}
        <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total Attempts</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
              <Key className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {data?.summary.totalAttempts ?? '—'}
          </div>
          <span className="text-[11px] text-muted-foreground/80 mt-1">
            Recorded login events
          </span>
        </div>

        {/* 2. Successful Logins */}
        <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Successful Logins</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {data?.summary.successfulLogins ?? '—'}
          </div>
          <span className="text-[11px] text-muted-foreground/80 mt-1">
            Authenticated sessions
          </span>
        </div>

        {/* 3. Failed Attempts */}
        <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Failed Attempts</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {data?.summary.failedLogins ?? '—'}
          </div>
          <span className="text-[11px] text-muted-foreground/80 mt-1">
            Rejected credentials
          </span>
        </div>

        {/* 4. Active Sessions */}
        <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Active Sessions</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Radio className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
            <span>{data?.summary.activeSessions ?? '—'}</span>
            {(data?.summary.activeSessions || 0) > 0 && (
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span className="text-[11px] text-muted-foreground/80 mt-1">
            Live authenticated devices
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search IP, location, browser, OS..."
            className="pl-9 h-8 text-xs bg-card/60 dark:bg-zinc-900/60 border-border/60 rounded-xl"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val: any) => {
              setStatusFilter(val)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs bg-card/60 dark:bg-zinc-900/60 border-border/60 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="success" className="text-xs">Success</SelectItem>
              <SelectItem value="failed" className="text-xs">Failed</SelectItem>
              <SelectItem value="suspicious" className="text-xs">Suspicious / Flagged</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select
            value={dateRangeFilter}
            onValueChange={(val: any) => {
              setDateRangeFilter(val)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs bg-card/60 dark:bg-zinc-900/60 border-border/60 rounded-xl">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Time</SelectItem>
              <SelectItem value="today" className="text-xs">Today</SelectItem>
              <SelectItem value="7days" className="text-xs">Last 7 Days</SelectItem>
              <SelectItem value="30days" className="text-xs">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header / Subtitle */}
        <div className="p-4 border-b border-border/40 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-bold text-sm text-foreground">Authentication & Session History</span>
            <span className="text-xs text-muted-foreground">
              ({data?.totalCount ?? 0} records)
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Times displayed in Asia/Kolkata (IST)</span>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <span className="text-xs">Retrieving security audit records...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-destructive flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchLogs(1)} className="mt-2 text-xs">
              Retry Query
            </Button>
          </div>
        ) : !data || data.records.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Shield className="w-10 h-10 opacity-20 text-muted-foreground mb-1" />
            <span className="text-sm font-semibold text-foreground">No Security Logs Found</span>
            <span className="text-xs max-w-sm text-muted-foreground">
              No authentication events match the selected filters. Change filters or log in to generate new audit entries.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/20 dark:bg-zinc-900/40 border-b border-border/40 dark:border-zinc-800/80 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Date & Time (IST)</th>
                  <th className="py-3 px-4">Event / Status</th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span>Source IP & Location</span>
                      <span
                        className="inline-flex items-center text-muted-foreground/70 hover:text-foreground cursor-help"
                        title="Source IP is captured on the server. VPNs, proxies, cellular networks, and dynamic IPs can affect the recorded address."
                      >
                        <Info className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-4">Browser & Operating System</th>
                  <th className="py-3 px-4">Session Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 dark:divide-zinc-800/60">
                {data.records.map(record => {
                  const isCurrentActive = record.session_status === 'Active'

                  return (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className="hover:bg-muted/30 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground text-xs">
                          {formatToKolkataTime(record.created_at)}
                        </div>
                        <div className="text-[10.5px] text-muted-foreground font-mono mt-0.5">
                          {record.auth_method || 'Password'}
                        </div>
                      </td>

                      {/* 2. Event & Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {getEventBadge(record)}
                          {record.flag_reason && record.status === 'Success' && (
                            <span className="text-[9.5px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              {record.flag_reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Source IP & Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {record.ip_address ? (
                            <>
                              <span className="font-mono text-foreground font-semibold text-xs select-all">
                                {record.ip_address}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopy(record.ip_address!, record.id, 'ip')
                                }}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors inline-flex items-center"
                                title="Copy IP Address"
                              >
                                {copiedIpId === record.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-mono font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                {getIpVersion(record.ip_address)}
                              </span>
                              {getIpBadge(record.ip_classification, record.ip_address)}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground/80 bg-muted/30 px-1.5 py-0.5 rounded border border-border/40">
                              Unavailable
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                          <span
                            className={cn(
                              "truncate max-w-[200px]",
                              (!record.ip_address || record.ip_classification === 'Localhost') && "text-muted-foreground/70"
                            )}
                            title={
                              record.ip_classification === 'Localhost'
                                ? 'Localhost (Development Environment)'
                                : (record.location || 'Unavailable')
                            }
                          >
                            {record.ip_classification === 'Localhost'
                              ? 'Localhost (Development Environment)'
                              : formatLocationDisplay(record.location, record.ip_address)}
                          </span>
                        </div>
                      </td>

                      {/* 4. Browser & OS */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const client = getClientDisplay(record)
                          return (
                            <>
                              <div className="flex items-center gap-1.5 text-foreground font-medium">
                                {getDeviceIcon(record.device, record.client_type)}
                                <span className="truncate max-w-[170px]" title={client.title}>{client.title}</span>
                                {client.isDesktop && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-normal">
                                    Desktop
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 pl-5 truncate max-w-[180px]" title={client.subtitle}>
                                {client.subtitle}
                              </div>
                            </>
                          )
                        })()}
                      </td>

                      {/* 5. Session Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {getSessionPill(record.session_status)}
                          {record.session_id && (
                            <span className="text-[9.5px] font-mono text-muted-foreground">
                              {record.session_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Revoke Session button for active sessions */}
                          {isCurrentActive && record.session_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRevokingSessionId(record.session_id!)}
                              className="h-7 px-2 text-[11px] text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                              title="Revoke active user session"
                            >
                              <Ban className="w-3 h-3 mr-1" /> Revoke
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRecord(record)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.totalPages > 1 && (
          <div className="p-3.5 border-t border-border/40 dark:border-zinc-800/80 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing Page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
              <span className="font-semibold text-foreground">{data.totalPages}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= data.totalPages || loading}
                className="h-7 px-2 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={Boolean(selectedRecord)} onOpenChange={open => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card dark:bg-zinc-950 border border-border/60 dark:border-zinc-800 rounded-2xl shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-border/40 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Security Audit Record Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Immutable server-side audit event details and device verification.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs pr-4">
              {/* Event Badge & Session Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Audit Event</span>
                  <div>{getEventBadge(selectedRecord)}</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[11px] text-muted-foreground font-medium">Session Status</span>
                  <div>{getSessionPill(selectedRecord.session_status)}</div>
                </div>
              </div>

              {/* Localhost Development Callout Banner */}
              {selectedRecord.ip_classification === 'Localhost' && (
                <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/30 text-blue-300 dark:text-blue-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs block text-blue-200">
                      Local Development Environment
                    </span>
                    <p className="text-[11px] text-blue-300/90 leading-relaxed">
                      Client connected via local loopback (<code className="font-mono bg-blue-900/40 px-1 py-0.2 rounded text-blue-200">{selectedRecord.ip_address || '::1'}</code>). In this local development configuration, the employee's genuine public client IP, carrier ISP, and geographic coordinates are not routed through a public reverse-proxy and are not available.
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 1: AUTHENTICATION & SESSION LIFECYCLE */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider text-[10.5px]">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Authentication & Session Lifecycle</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Login Timestamp (IST)</span>
                    <span className="font-semibold text-foreground text-xs">
                      {formatToKolkataTime(selectedRecord.created_at)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Authentication Method</span>
                    <span className="font-semibold text-foreground text-xs">
                      {selectedRecord.auth_method || 'Password'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Session Status</span>
                    <div className="mt-0.5">{getSessionPill(selectedRecord.session_status)}</div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Session Identifier</span>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="font-mono text-xs text-foreground truncate select-all" title={selectedRecord.session_id || 'Not assigned'}>
                        {selectedRecord.session_id || 'Not assigned'}
                      </span>
                      {selectedRecord.session_id && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedRecord.session_id!, selectedRecord.id, 'session')}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded shrink-0 transition-colors"
                          title="Copy Session ID"
                        >
                          {copiedSessionId === selectedRecord.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TIME TRACKER WORK ACTIVITY (Only if time tracking telemetry is recorded) */}
              {(selectedRecord.clock_in || selectedRecord.clock_out || selectedRecord.worked_minutes != null || selectedRecord.active_minutes != null || selectedRecord.client_type === 'desktop_app') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider text-[10.5px]">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Time Tracker Work Session</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                      <span className="text-[10px] text-muted-foreground block mb-0.5">Clock-in Timestamp</span>
                      <span className="font-semibold text-foreground text-xs">
                        {selectedRecord.clock_in ? formatToKolkataTime(selectedRecord.clock_in) : '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                      <span className="text-[10px] text-muted-foreground block mb-0.5">Clock-out Timestamp</span>
                      <span className="font-semibold text-foreground text-xs">
                        {selectedRecord.clock_out
                          ? formatToKolkataTime(selectedRecord.clock_out)
                          : (selectedRecord.session_status === 'Active' ? 'Active / In Progress' : '—')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                      <span className="text-[10px] text-muted-foreground block mb-0.5">Worked Duration</span>
                      <span className="font-semibold text-foreground text-xs">
                        {selectedRecord.worked_minutes != null ? `${selectedRecord.worked_minutes} mins` : '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                      <span className="text-[10px] text-muted-foreground block mb-0.5">Active Duration</span>
                      <span className="font-semibold text-foreground text-xs">
                        {selectedRecord.active_minutes != null ? `${selectedRecord.active_minutes} mins` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: NETWORK DETAILS */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider text-[10.5px]">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Network & Connectivity Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Source IP Address</span>
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      {selectedRecord.ip_address ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-foreground text-xs select-all">
                              {selectedRecord.ip_address}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedRecord.ip_address!, selectedRecord.id, 'ip')}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors inline-flex items-center"
                              title="Copy IP Address"
                            >
                              {copiedIpId === selectedRecord.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-mono font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            {getIpVersion(selectedRecord.ip_address)}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-muted-foreground/70 text-xs">Unavailable</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Network Classification</span>
                    <div className="mt-0.5">
                      {getIpBadge(selectedRecord.ip_classification, selectedRecord.ip_address)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30 col-span-2">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Approximate Location</span>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span className={cn(
                        "font-semibold text-foreground text-xs",
                        (!selectedRecord.ip_address || selectedRecord.ip_classification === 'Localhost') && "text-muted-foreground/90 font-medium"
                      )}>
                        {selectedRecord.ip_classification === 'Localhost'
                          ? 'Localhost (Development Environment)'
                          : (selectedRecord.location || (selectedRecord.ip_address ? 'Location Unavailable' : 'Not captured'))}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Internet Service Provider (ISP)</span>
                    <span className="text-foreground text-xs font-medium">
                      {selectedRecord.ip_classification === 'Localhost'
                        ? 'Unavailable in local development'
                        : (selectedRecord.isp || (selectedRecord.ip_address ? 'Unavailable' : 'Not captured'))}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Timezone / Coordinates</span>
                    <span className="text-foreground text-xs font-mono">
                      {selectedRecord.latitude && selectedRecord.longitude
                        ? `${selectedRecord.latitude.toFixed(4)}, ${selectedRecord.longitude.toFixed(4)} (Approximate)`
                        : (selectedRecord.ip_classification === 'Localhost'
                            ? 'Asia/Kolkata (System Timezone)'
                            : (selectedRecord.timezone || 'Not captured'))}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: DEVICE & APPLICATION DETAILS */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider text-[10.5px]">
                  <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Device & Application Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Client Type</span>
                    <span className="font-semibold text-foreground text-xs">
                      {selectedRecord.client_type === 'desktop_app' || selectedRecord.app_name === 'TripleS Time Tracker'
                        ? 'Native Desktop Application'
                        : 'Web Browser'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">
                      {selectedRecord.client_type === 'desktop_app' || selectedRecord.app_name === 'TripleS Time Tracker'
                        ? 'Desktop Application'
                        : 'Browser & Engine'}
                    </span>
                    <span className="font-semibold text-foreground text-xs">
                      {selectedRecord.client_type === 'desktop_app' || selectedRecord.app_name === 'TripleS Time Tracker'
                        ? `${selectedRecord.app_name || 'TripleS Time Tracker'} v${selectedRecord.app_version || '1.0.0'}`
                        : `${selectedRecord.browser || 'Web Browser'}${selectedRecord.browser_engine ? ` (${selectedRecord.browser_engine})` : ''}`}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Operating System</span>
                    <span className="font-semibold text-foreground text-xs">
                      {selectedRecord.os || 'Windows 11 / 10'}
                      {selectedRecord.os_version && !selectedRecord.os?.includes(selectedRecord.os_version) ? ` (${selectedRecord.os_version})` : ''}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-0.5">Device Category</span>
                    <span className="font-semibold text-foreground text-xs">
                      {selectedRecord.device || 'Desktop'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: ADDITIONAL METADATA */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider text-[10.5px]">
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Additional Metadata</span>
                </div>

                {/* Raw User Agent */}
                <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                  <span className="text-[10px] text-muted-foreground block mb-1">User-Agent Header</span>
                  <p className="font-mono text-[10px] text-muted-foreground break-all leading-relaxed">
                    {selectedRecord.user_agent || 'Not captured'}
                  </p>
                </div>

                {/* Safe Event Metadata */}
                {sanitizedModalMetadata && (
                  <div className="p-2.5 rounded-xl border border-border/40 bg-card/40 dark:bg-zinc-900/30">
                    <span className="text-[10px] text-muted-foreground block mb-1">Safe Event Metadata</span>
                    <pre className="font-mono text-[10px] text-muted-foreground bg-muted/20 p-2 rounded-lg overflow-x-auto">
                      {JSON.stringify(sanitizedModalMetadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Verification Notice */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/15 dark:bg-zinc-900/30 text-[10px] text-muted-foreground">
                  <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>
                    Source IP is captured on the trusted server side. In production, requests routed through reverse proxies (Vercel, Cloudflare) provide real public client IPs. VPNs, cellular dynamic IPs, and corporate networks can affect the recorded address.
                  </span>
                </div>

                {/* Event UUID with Copy */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 pt-1 border-t border-border/30">
                  <div className="flex items-center gap-1">
                    <span>Event ID:</span>
                    <span className="font-mono">{selectedRecord.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedRecord.id, selectedRecord.id, 'event')}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors inline-flex items-center gap-1 text-[10px]"
                    title="Copy Event ID"
                  >
                    {copiedEventId === selectedRecord.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 bg-card dark:bg-zinc-950 border-t border-border/80 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0 z-10 shadow-lg">
            {selectedRecord?.session_status === 'Active' && selectedRecord.session_id && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setRevokingSessionId(selectedRecord.session_id!)
                }}
                className="h-8 text-xs gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Revoke Session
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRecord(null)}
              className="h-8 text-xs ml-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revocation Confirmation Dialog */}
      <Dialog open={Boolean(revokingSessionId)} onOpenChange={open => !open && setRevokingSessionId(null)}>
        <DialogContent className="max-w-md bg-card dark:bg-zinc-950 border border-border/60 dark:border-zinc-800 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-400 mb-1">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-foreground">
                Revoke Active Session?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              This will immediately terminate the authenticated session{' '}
              <span className="font-mono text-foreground font-semibold">{revokingSessionId}</span>. The
              employee will be logged out on that device and required to re-authenticate.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              disabled={isRevoking}
              onClick={() => setRevokingSessionId(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isRevoking}
              onClick={handleRevokeSession}
              className="h-8 text-xs gap-1.5"
            >
              {isRevoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              <span>Confirm Revocation</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
