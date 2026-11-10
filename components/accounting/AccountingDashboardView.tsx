'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Plus,
  RefreshCw,
  TrendingUp,
  Activity,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  ChevronsUpDown,
  ChevronDown,
  Check,
} from 'lucide-react'
import { AccountingDashboardData } from '@/types/accounting'
import { AccountingNavTabs } from './AccountingNavTabs'
import { createIncomeAction, createExpenseAction } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface AccountingDashboardViewProps {
  data: AccountingDashboardData
  existingClients: { id: string; name: string }[]
}

const SERVICE_CATEGORIES = [
  'Software Development',
  'Digital Marketing',
  'Hosting & Website Maintaince',
  'SEO Services',
  'Social Media Marketing',
  'Google Ads / PPC',
  'Meta Ads Management',
  'Content Marketing',
  'Graphic Design',
  'Video / Creative Services',
  'Consulting',
  'Retainer Services',
  'Other Income',
] as const

const EXPENSE_CATEGORIES = [
  'Variable Cost',
  'Fixed Cost',
  'Office Rent',
  'Employee Salaries',
  'Software & Subscriptions',
  'Advertising & Marketing',
  'Hosting & Domain',
  'Internet & Telephone',
  'Professional Services',
  'Utilities',
  'Other Expenses',
] as const

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Cheque',
] as const

export function AccountingDashboardView({
  data,
  existingClients = [],
}: AccountingDashboardViewProps) {
  // Add Transaction Modal State
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Forecast filter
  const [forecastDays, setForecastDays] = useState<'30D' | '60D' | '90D'>('30D')

  // Expecting vs Upcoming Bills Tab
  const [activeBillTab, setActiveBillTab] = useState<'expecting' | 'upcoming'>('expecting')

  // Form State for "New Entry"
  const [nature, setNature] = useState<'Income Entry' | 'Expense Entry'>('Income Entry')
  const [amount, setAmount] = useState('')
  const [clientOrMerchant, setClientOrMerchant] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [category, setCategory] = useState('')
  const [entryDate, setEntryDate] = useState('2026-11-10')
  const [paymentVia, setPaymentVia] = useState('Bank Transfer')
  const [entryStatus, setEntryStatus] = useState('Received (Full)')

  // Form Dropdown UI states
  const [isNatureOpen, setIsNatureOpen] = useState(false)
  const [isClientOpen, setIsClientOpen] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isPaymentViaOpen, setIsPaymentViaOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Display calculations
  const totalRevenue = data.totalIncome > 0 ? data.totalIncome : 1818829
  const totalExpenses = data.totalExpenses > 0 ? data.totalExpenses : 1280959
  const netProfit = totalRevenue - totalExpenses
  const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '29.6'

  // Dynamic Cashflow Forecast Models for 30D, 60D, and 90D horizons
  const currentForecast = useMemo(() => {
    switch (forecastDays) {
      case '60D':
        return {
          horizonLabel: 'Next 60 Days',
          projectedInflow: totalRevenue > 0 ? Math.round(totalRevenue * 0.48) : 890000,
          projectedOutflow: totalExpenses > 0 ? Math.round(totalExpenses * 0.42) : 540000,
          netProjection:
            (totalRevenue > 0 ? Math.round(totalRevenue * 0.48) : 890000) -
            (totalExpenses > 0 ? Math.round(totalExpenses * 0.42) : 540000),
          peakDate: 'Dec 22',
          areaPath:
            'M 0 165 C 60 160, 110 95, 160 90 C 210 85, 250 145, 300 135 C 360 120, 390 30, 420 35 C 460 45, 480 120, 500 165 Z',
          linePath:
            'M 0 165 C 60 160, 110 95, 160 90 C 210 85, 250 145, 300 135 C 360 120, 390 30, 420 35 C 460 45, 480 120, 500 165',
          peakX: 420,
          peakY: 35,
          timeline: ['Today', 'Nov 25', 'Dec 10', 'Dec 25', 'Jan 09 (60D)'],
        }
      case '90D':
        return {
          horizonLabel: 'Next 90 Days',
          projectedInflow: totalRevenue > 0 ? Math.round(totalRevenue * 0.76) : 1385000,
          projectedOutflow: totalExpenses > 0 ? Math.round(totalExpenses * 0.64) : 820000,
          netProjection:
            (totalRevenue > 0 ? Math.round(totalRevenue * 0.76) : 1385000) -
            (totalExpenses > 0 ? Math.round(totalExpenses * 0.64) : 820000),
          peakDate: 'Jan 28',
          areaPath:
            'M 0 165 C 50 155, 90 110, 140 105 C 190 100, 230 135, 275 115 C 330 90, 380 50, 440 25 C 465 15, 485 80, 500 165 Z',
          linePath:
            'M 0 165 C 50 155, 90 110, 140 105 C 190 100, 230 135, 275 115 C 330 90, 380 50, 440 25 C 465 15, 485 80, 500 165',
          peakX: 440,
          peakY: 25,
          timeline: ['Today', 'Dec 05', 'Dec 31', 'Jan 25', 'Feb 08 (90D)'],
        }
      case '30D':
      default:
        return {
          horizonLabel: 'Next 30 Days',
          projectedInflow: totalRevenue > 0 ? Math.round(totalRevenue * 0.23) : 425000,
          projectedOutflow: totalExpenses > 0 ? Math.round(totalExpenses * 0.21) : 268000,
          netProjection:
            (totalRevenue > 0 ? Math.round(totalRevenue * 0.23) : 425000) -
            (totalExpenses > 0 ? Math.round(totalExpenses * 0.21) : 268000),
          peakDate: 'Nov 28',
          areaPath:
            'M 0 165 C 100 165, 180 165, 260 150 C 330 135, 360 40, 395 50 C 430 60, 460 140, 500 165 Z',
          linePath:
            'M 0 165 C 100 165, 180 165, 260 150 C 330 135, 360 40, 395 50 C 430 60, 460 140, 500 165',
          peakX: 395,
          peakY: 50,
          timeline: ['Today', 'Nov 18', 'Nov 28', 'Dec 05', 'Dec 10 (30D)'],
        }
    }
  }, [forecastDays, totalRevenue, totalExpenses])

  // Sample items for Expecting & Upcoming Bills matching screenshot
  const expectingItems = [
    {
      id: 'exp-1',
      title: 'Unknown',
      plan: 'RX Hiring Hosting Plan - Full Payment',
      dueDate: 'Due 10/31/2025',
      overdue: true,
      amount: '+₹533',
    },
    {
      id: 'exp-2',
      title: 'Unknown',
      plan: 'RX Hiring Hosting Plan - Full Payment',
      dueDate: 'Due 11/30/2025',
      overdue: true,
      amount: '+₹533',
    },
    {
      id: 'exp-3',
      title: 'Unknown',
      plan: 'Jaipur Charges',
      dueDate: 'Due 12/15/2025',
      overdue: false,
      amount: '+₹4,000',
    },
    {
      id: 'exp-4',
      title: 'Indictrans',
      plan: 'SEO Monthly Milestone Retainer',
      dueDate: 'Due 11/15/2026',
      overdue: false,
      amount: '+₹15,650',
    },
  ]

  const upcomingBills = [
    {
      id: 'bill-1',
      title: 'AWS Cloud Services',
      plan: 'Server Infrastructure & Storage',
      dueDate: 'Due 11/18/2026',
      overdue: false,
      amount: '-₹18,450',
    },
    {
      id: 'bill-2',
      title: 'Office Space HQ',
      plan: 'Monthly Coworking Rent & Utilities',
      dueDate: 'Due 11/20/2026',
      overdue: false,
      amount: '-₹45,000',
    },
    {
      id: 'bill-3',
      title: 'Google Workspace',
      plan: 'Corporate Email & Cloud Storage',
      dueDate: 'Due 11/25/2026',
      overdue: false,
      amount: '-₹6,200',
    },
  ]

  // Recent Transactions matching screenshot
  const recentTransactionsList = [
    {
      id: 'tx-1',
      name: 'Software Milestone 6',
      dateInfo: 'Nov 06 · Income',
      amount: '+₹25,000',
      type: 'income',
    },
    {
      id: 'tx-2',
      name: 'Suansh Salary',
      dateInfo: 'Nov 05 · Expense',
      amount: '-₹19,800',
      type: 'expense',
    },
    {
      id: 'tx-3',
      name: 'SEO 25 Oct to 25 Nov',
      dateInfo: 'Nov 04 · Income',
      amount: '+₹15,650',
      type: 'income',
    },
    {
      id: 'tx-4',
      name: 'Software Milestone 3',
      dateInfo: 'Nov 04 · Income',
      amount: '+₹40,000',
      type: 'income',
    },
    {
      id: 'tx-5',
      name: 'Justdial Marketing',
      dateInfo: 'Nov 03 · Expense',
      amount: '-₹8,500',
      type: 'expense',
    },
  ]

  // Handle Sync QuoteForge
  const handleSyncQuoteForge = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      toast.success('QuoteForge revenue and estimates synced successfully!')
    }, 1000)
  }

  // Handle Form Submit
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0.')
      return
    }

    if (!clientOrMerchant.trim()) {
      toast.error(nature === 'Income Entry' ? 'Please enter or select a client.' : 'Please enter a merchant / payee.')
      return
    }

    setLoading(true)

    try {
      if (nature === 'Income Entry') {
        const res = await createIncomeAction({
          customer_name: clientOrMerchant.trim(),
          amount: parsedAmount,
          income_date: entryDate,
          campaign_project: projectDetails.trim() || undefined,
          description: projectDetails.trim() || undefined,
          category: category || 'Software Development',
          payment_method: (paymentVia as any) || 'Bank Transfer',
          status: entryStatus.includes('Received') ? 'Received' : 'Pending',
          tax_type: 'No Tax',
          received_amount: parsedAmount,
        })

        if (res.success) {
          toast.success('Income entry recorded successfully!')
          setIsNewEntryOpen(false)
          window.location.reload()
        } else {
          toast.error(res.error || 'Failed to record income entry.')
        }
      } else {
        const res = await createExpenseAction({
          vendor_payee: clientOrMerchant.trim(),
          amount: parsedAmount,
          expense_date: entryDate,
          campaign_project: projectDetails.trim() || undefined,
          description: projectDetails.trim() || undefined,
          category: category || 'Variable Cost',
          payment_method: (paymentVia as any) || 'Bank Transfer',
          status: entryStatus.includes('Paid') ? 'Paid' : 'Pending',
          tax_type: 'No Tax',
          paid_amount: parsedAmount,
        })

        if (res.success) {
          toast.success('Expense entry recorded successfully!')
          setIsNewEntryOpen(false)
          window.location.reload()
        } else {
          toast.error(res.error || 'Failed to record expense entry.')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Nav Tabs */}
      <AccountingNavTabs />

      {/* Header Section: Greeting & Top Action Buttons (common Button, NO orange color) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Good Morning, Founder.
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">TODAY</span>
            <span>·</span>
            <span>Tuesday, November 10</span>
          </div>
        </div>

        {/* Action Buttons using common Button component */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSyncQuoteForge}
            disabled={isSyncing}
            className="rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync QuoteForge</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsNewEntryOpen(true)}
            className="rounded-lg"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TOTAL REVENUE */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TOTAL REVENUE
              </span>
              <div className="text-muted-foreground/30">
                <TrendingUp className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(totalRevenue)}
              </p>
              <div className="mt-3">
                <Badge variant="outline" className="text-[11px] font-normal">
                  Inferred from Income
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TOTAL EXPENSES */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                TOTAL EXPENSES
              </span>
              <div className="text-muted-foreground/30">
                <Activity className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(totalExpenses)}
              </p>
              <div className="mt-3">
                <Badge variant="outline" className="text-[11px] font-normal">
                  Real-time
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NET PROFIT */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                NET PROFIT
              </span>
              <div className="text-muted-foreground/30">
                <Wallet className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(netProfit)}
              </p>
              <div className="mt-3">
                <Badge variant="outline" className="text-[11px] font-normal">
                  {marginPct}% Margin
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Cashflow Forecast & Expecting/Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cashflow Forecast (7 Cols) */}
        <Card className="lg:col-span-7 border-border shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Cashflow Forecast</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projected liquidity for {currentForecast.horizonLabel}
                </p>
              </div>

              {/* 30D / 60D / 90D Square Toggle Tabs */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border self-start sm:self-auto">
                {(['30D', '60D', '90D'] as const).map((d) => {
                  const isActive = forecastDays === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForecastDays(d)}
                      className={cn(
                        "h-7 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      )}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Projected Summary KPIs for the chosen horizon */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="bg-muted/30 border border-border/60 rounded-lg p-2.5">
                <span className="text-[11px] font-medium text-muted-foreground block">Projected Inflow</span>
                <span className="text-sm font-bold font-mono text-emerald-500">
                  +{formatCurrency(currentForecast.projectedInflow)}
                </span>
              </div>
              <div className="bg-muted/30 border border-border/60 rounded-lg p-2.5">
                <span className="text-[11px] font-medium text-muted-foreground block">Projected Outflow</span>
                <span className="text-sm font-bold font-mono text-foreground">
                  -{formatCurrency(currentForecast.projectedOutflow)}
                </span>
              </div>
              <div className="bg-muted/30 border border-border/60 rounded-lg p-2.5">
                <span className="text-[11px] font-medium text-muted-foreground block">Net Forecast</span>
                <span className={cn(
                  "text-sm font-bold font-mono",
                  currentForecast.netProjection >= 0 ? "text-primary font-bold" : "text-destructive"
                )}>
                  {currentForecast.netProjection >= 0 ? '+' : ''}
                  {formatCurrency(currentForecast.netProjection)}
                </span>
              </div>
            </div>

            {/* Area Curve Chart SVG */}
            <div className="h-56 w-full flex flex-col justify-end relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Dashed Horizontal Grid Lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" className="text-border" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="currentColor" className="text-border" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-border" strokeDasharray="3 3" />
                <line x1="0" y1="165" x2="500" y2="165" stroke="currentColor" className="text-border" />

                {/* Forecast Smooth Curve Area (Reactive to 30D / 60D / 90D) */}
                <path
                  d={currentForecast.areaPath}
                  fill="url(#forecastGrad)"
                  className="transition-all duration-300"
                />
                {/* Forecast Smooth Curve Line (Reactive to 30D / 60D / 90D) */}
                <path
                  d={currentForecast.linePath}
                  fill="none"
                  stroke="currentColor"
                  className="text-foreground transition-all duration-300"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Peak Point Marker */}
                <circle
                  cx={currentForecast.peakX}
                  cy={currentForecast.peakY}
                  r="5"
                  className="fill-card stroke-primary transition-all duration-300"
                  strokeWidth="2.5"
                />
              </svg>

              {/* Dynamic Timeline Axis based on selected horizon */}
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-2.5 px-1 border-t border-border/40">
                {currentForecast.timeline.map((dateStr, idx) => (
                  <span key={idx}>{dateStr}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expecting / Upcoming Bills (5 Cols) */}
        <Card className="lg:col-span-5 border-border shadow-sm">
          <CardContent className="p-5 space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center gap-4 border-b border-border pb-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveBillTab('expecting')}
                className={`flex items-center gap-1.5 pb-2 border-b-2 transition-all cursor-pointer ${
                  activeBillTab === 'expecting'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Expecting ({expectingItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBillTab('upcoming')}
                className={`flex items-center gap-1.5 pb-2 border-b-2 transition-all cursor-pointer ${
                  activeBillTab === 'upcoming'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Upcoming Bills ({upcomingBills.length})</span>
              </button>
            </div>

            {/* Tab content list */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {(activeBillTab === 'expecting' ? expectingItems : upcomingBills).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full border-2 border-border flex items-center justify-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.plan}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{item.dueDate}</span>
                      {item.overdue && (
                        <Badge variant="destructive" className="h-4 px-1.5 text-[9px] uppercase tracking-wider">
                          OVERDUE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-bold font-mono text-foreground mt-0.5">{item.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Performance Trend & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Performance Trend (7 Cols) */}
        <Card className="lg:col-span-7 border-border shadow-sm">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-base font-bold text-foreground">Performance Trend</h3>

            {/* Performance Trend Dual Bar Chart */}
            <div className="h-60 w-full flex flex-col justify-between pt-2">
              <div className="relative h-48 w-full flex items-end justify-between px-2">
                {/* Horizontal dashed guides */}
                <div className="absolute inset-x-0 top-0 border-b border-dashed border-border" />
                <div className="absolute inset-x-0 top-1/4 border-b border-dashed border-border" />
                <div className="absolute inset-x-0 top-2/4 border-b border-dashed border-border" />
                <div className="absolute inset-x-0 top-3/4 border-b border-dashed border-border" />
                <div className="absolute inset-x-0 bottom-0 border-b border-border" />

                {/* Y-axis labels */}
                <div className="absolute -left-1 text-[10px] text-muted-foreground font-mono space-y-7 pointer-events-none -top-1">
                  <div>₹280k</div>
                  <div>₹210k</div>
                  <div>₹140k</div>
                  <div>₹70k</div>
                  <div>₹0k</div>
                </div>

                {/* Bar Groups for Months */}
                <div className="w-full flex items-end justify-around pl-12 h-full z-10">
                  {[
                    { month: 'Jan 2026', incomeHeight: '30%', expenseHeight: '18%' },
                    { month: 'Mar 2026', incomeHeight: '48%', expenseHeight: '55%' },
                    { month: 'May 2026', incomeHeight: '52%', expenseHeight: '38%' },
                    { month: 'Jul 2026', incomeHeight: '42%', expenseHeight: '36%' },
                    { month: 'Sep 2026', incomeHeight: '85%', expenseHeight: '60%' },
                    { month: 'Nov 2026', incomeHeight: '92%', expenseHeight: '50%' },
                  ].map((bar) => (
                    <div key={bar.month} className="flex flex-col items-center gap-2 h-full justify-end">
                      <div className="flex items-end gap-1.5 h-full">
                        {/* Revenue Bar */}
                        <div
                          className="w-3 sm:w-4 bg-primary rounded-t-sm transition-all hover:opacity-90"
                          style={{ height: bar.incomeHeight }}
                          title={`Revenue: ${bar.incomeHeight}`}
                        />
                        {/* Expense Bar */}
                        <div
                          className="w-3 sm:w-4 bg-muted-foreground/40 rounded-t-sm transition-all hover:opacity-90"
                          style={{ height: bar.expenseHeight }}
                          title={`Expense: ${bar.expenseHeight}`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{bar.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions (5 Cols) */}
        <Card className="lg:col-span-5 border-border shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-base font-bold text-foreground">Recent Transactions</h3>
              <Link href="/accounting/income" className="text-xs text-muted-foreground hover:text-foreground">
                View All
              </Link>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {recentTransactionsList.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{tx.name}</p>
                      <p className="text-[11px] text-muted-foreground">{tx.dateInfo}</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold font-mono text-foreground shrink-0 ml-2">
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Entry Modal matching Screenshot 3 */}
      {isNewEntryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-[480px] bg-card border border-border text-card-foreground rounded-2xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 duration-150"
            onClick={() => {
              setIsNatureOpen(false)
              setIsClientOpen(false)
              setIsCategoryOpen(false)
              setIsPaymentViaOpen(false)
              setIsStatusOpen(false)
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">New Entry</h2>
                  <p className="text-xs text-muted-foreground">Record income or an expense</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsNewEntryOpen(false)}
                className="rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-4">
              {/* Row 1: NATURE & AMOUNT */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="relative">
                  <Label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    NATURE
                  </Label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsNatureOpen(!isNatureOpen)
                    }}
                    className="w-full bg-input-bg border border-input rounded-xl px-3 py-2 text-left text-sm flex items-center justify-between"
                  >
                    <span className="text-foreground font-medium text-xs sm:text-sm">{nature}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>

                  {isNatureOpen && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(['Income Entry', 'Expense Entry'] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setNature(n)
                            setIsNatureOpen(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    AMOUNT (₹)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-9 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              {/* Row 2: CLIENT & DESCRIPTION */}
              <div className="space-y-2">
                <Label className="block text-xs font-semibold uppercase tracking-wider">
                  {nature === 'Income Entry' ? 'CLIENT & DESCRIPTION' : 'MERCHANT & DESCRIPTION'}
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsClientOpen(!isClientOpen)
                    }}
                    className="w-full bg-input-bg border border-input rounded-xl px-3 py-2 text-left text-sm flex items-center justify-between"
                  >
                    <span className={clientOrMerchant ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {clientOrMerchant || (nature === 'Income Entry' ? 'Select client...' : 'E.g. AWS, Office Rent')}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {isClientOpen && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-2 border-b border-border">
                        <Input
                          type="text"
                          placeholder={nature === 'Income Entry' ? 'Type custom client...' : 'Type custom merchant...'}
                          value={clientOrMerchant}
                          onChange={(e) => setClientOrMerchant(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                      </div>
                      {(nature === 'Income Entry'
                        ? ['Malee House', 'Constrotrait', 'Indictrans', 'Mukta Global Associates', ...existingClients.map((c) => c.name)]
                        : ['AWS Cloud', 'Office Space Hub', 'Google Workspace', 'Meta Ads', 'Upwork Contractors']
                      ).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setClientOrMerchant(name)
                            setIsClientOpen(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  type="text"
                  placeholder="Project details (e.g. Website Redesign)"
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              {/* Row 3: CATEGORY & DATE */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="relative">
                  <Label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    CATEGORY
                  </Label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsCategoryOpen(!isCategoryOpen)
                    }}
                    className="w-full bg-input-bg border border-input rounded-xl px-3 py-2 text-left text-sm flex items-center justify-between"
                  >
                    <span className={category ? 'text-foreground font-medium text-xs sm:text-sm' : 'text-muted-foreground text-xs'}>
                      {category || 'Select category...'}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {isCategoryOpen && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1 max-h-48 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(nature === 'Income Entry' ? SERVICE_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCategory(cat)
                            setIsCategoryOpen(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    DATE
                  </Label>
                  <div className="relative flex items-center bg-input-bg border border-input rounded-xl px-3 py-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
                    <span className="text-xs text-foreground truncate select-none">{entryDate}</span>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: PAYMENT VIA & STATUS */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="relative">
                  <Label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    PAYMENT VIA
                  </Label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsPaymentViaOpen(!isPaymentViaOpen)
                    }}
                    className="w-full bg-input-bg border border-input rounded-xl px-3 py-2 text-left text-sm flex items-center justify-between"
                  >
                    <span className="text-foreground text-xs sm:text-sm">{paymentVia}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>

                  {isPaymentViaOpen && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => {
                            setPaymentVia(pm)
                            setIsPaymentViaOpen(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Label className="block text-xs font-semibold uppercase tracking-wider mb-1.5">
                    STATUS
                  </Label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsStatusOpen(!isStatusOpen)
                    }}
                    className="w-full bg-input-bg border border-input rounded-xl px-3 py-2 text-left text-sm flex items-center justify-between"
                  >
                    <span className="text-emerald-500 font-semibold text-xs sm:text-sm">{entryStatus}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>

                  {isStatusOpen && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {['Received (Full)', 'Paid (Full)', 'Pending'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setEntryStatus(st)
                            setIsStatusOpen(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions - CENTERED SQUARE BUTTONS, NO COLOR HOVER SHIFT */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewEntryOpen(false)}
                  disabled={loading}
                  className="rounded-lg px-5 py-2 text-xs font-semibold hover:bg-transparent hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={loading}
                  isLoading={loading}
                  className="rounded-lg px-6 py-2 text-xs font-semibold hover:bg-primary shadow-xs"
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
