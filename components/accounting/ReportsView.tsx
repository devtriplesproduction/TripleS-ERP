'use client'

import { useState } from 'react'
import {
  Calendar,
  Download,
  PieChart as PieIcon,
  TrendingUp,
  Activity,
  Wallet,
  Layers,
  FileSpreadsheet,
  FileText,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { AccountingReportMetrics } from '@/types/accounting'
import { AccountingNavTabs } from './AccountingNavTabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ReportsViewProps {
  metrics: AccountingReportMetrics
}

export function ReportsView({ metrics }: ReportsViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('Last 12 Months')
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false)

  const periods = [
    'Last 12 Months',
    'Current Fiscal Year',
    'Last 6 Months',
    'Last Quarter (Q3)',
    'All Time',
  ]

  // Download statement handler
  const handleDownload = (statement: { title: string; format: 'PDF' | 'CSV'; period: string }) => {
    if (statement.format === 'CSV') {
      const csvContent =
        'Date,Transaction,Category,Amount,Type,Status\n' +
        '2026-11-06,Software Milestone 6,Software Development,25000,Income,Received\n' +
        '2026-11-05,Suansh Salary,Payroll & Compensation,19800,Expense,Paid\n' +
        '2026-11-04,SEO 25 Oct to 25 Nov,Digital Marketing,15650,Income,Received\n' +
        '2026-11-04,Software Milestone 3,Software Development,40000,Income,Received\n' +
        '2026-11-03,Justdial Marketing,Marketing & Ads,8500,Expense,Paid\n' +
        '2026-11-01,Office Rent,Premises & Utilities,65000,Expense,Paid\n'

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${statement.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Downloaded ${statement.title}`)
    } else {
      // PDF mock trigger / print window
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${statement.title}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
                h1 { margin-bottom: 4px; font-size: 22px; }
                .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
                th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; }
                th { background: #f5f5f5; font-size: 12px; text-transform: uppercase; }
                .amount { text-align: right; font-family: monospace; font-weight: bold; }
                .total { font-weight: bold; background: #fafafa; }
              </style>
            </head>
            <body>
              <h1>Triple S Production — ${statement.title}</h1>
              <div class="meta">Period: ${statement.period} | Generated: ${new Date().toLocaleDateString()}</div>
              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Account Class</th>
                    <th class="amount">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Total Revenue / Service Fees</td><td>Operating Income</td><td class="amount">₹18,18,829.00</td></tr>
                  <tr><td>Direct Project Costs & Freelancers</td><td>Cost of Goods Sold</td><td class="amount">₹3,45,200.00</td></tr>
                  <tr><td>Salaries & Human Resources</td><td>Operating Expense</td><td class="amount">₹5,80,000.00</td></tr>
                  <tr><td>Office Rent & Utilities</td><td>Premises</td><td class="amount">₹1,95,000.00</td></tr>
                  <tr><td>Digital Ads & Marketing Tools</td><td>Sales & Marketing</td><td class="amount">₹1,60,759.00</td></tr>
                  <tr class="total"><td>Net Operating Profit (EBITDA)</td><td>Net Margin: 29.6%</td><td class="amount">₹5,37,869.00</td></tr>
                </tbody>
              </table>
              <script>
                window.onload = function() { window.print(); }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
      toast.success(`Preparing ${statement.title} for print / export`)
    }
  }

  return (
    <div className="space-y-7">
      <AccountingNavTabs />

      {/* Header section matching Screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financial statements, P&L breakdown, and deep-dive insights.
          </p>
        </div>

        {/* Filter Dropdown (Square button rounded-lg, no orange) */}
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
            className="rounded-lg h-9 px-3.5 text-xs font-semibold gap-2 border-border shadow-xs"
          >
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{selectedPeriod}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          </Button>

          {isPeriodMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card p-1 shadow-lg z-30">
              {periods.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelectedPeriod(p)
                    setIsPeriodMenuOpen(false)
                    toast.success(`Report period switched to ${p}`)
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md font-medium transition-colors ${selectedPeriod === p
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: Expense Breakdown & Net Profit Trend (Screenshot 2) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Expense Breakdown (5 cols) */}
        <Card className="lg:col-span-5 border-border shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Expense Breakdown
              </h3>
            </div>

            {/* Circular Donut Diagram */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative w-44 h-44">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-muted/40"
                    strokeWidth="14"
                    fill="none"
                  />
                  {/* Donut Segments with dasharray */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#e2e8f0"
                    strokeWidth="14"
                    strokeDasharray="114 238"
                    strokeDashoffset="0"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#cbd5e1"
                    strokeWidth="14"
                    strokeDasharray="30 238"
                    strokeDashoffset="-114"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#f97316"
                    strokeWidth="14"
                    strokeDasharray="25 238"
                    strokeDashoffset="-144"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#d97706"
                    strokeWidth="14"
                    strokeDasharray="24 238"
                    strokeDashoffset="-169"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#ef4444"
                    strokeWidth="14"
                    strokeDasharray="16 238"
                    strokeDashoffset="-193"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#64748b"
                    strokeWidth="14"
                    strokeDasharray="29 238"
                    strokeDashoffset="-209"
                    fill="none"
                  />
                </svg>
                {/* Center Circle cutout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] text-muted-foreground font-medium">Total</span>
                  <span className="text-sm font-bold font-mono text-foreground">₹5.24L</span>
                </div>
              </div>

              {/* Legend matching Screenshot 2 */}
              <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 mt-5 text-[11px] text-muted-foreground">
                {metrics.expenseBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Net Profit Trend (7 cols) */}
        <Card className="lg:col-span-7 border-border shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Net Profit Trend
              </h3>
            </div>

            {/* Line Chart SVG with Y-axis labels & points */}
            <div className="h-64 w-full flex relative pt-2">
              {/* Y-axis labels matching Screenshot 2: ₹105k, ₹70k, ₹35k, ₹0k, -₹35k */}
              <div className="w-12 flex flex-col justify-between text-[11px] font-mono text-muted-foreground text-right pr-2 select-none">
                <span>₹105k</span>
                <span>₹70k</span>
                <span>₹35k</span>
                <span>₹0k</span>
                <span>-₹35k</span>
              </div>

              {/* Chart Grid & Curve */}
              <div className="flex-1 flex flex-col justify-between relative">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 540 200"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  <line x1="0" y1="10" x2="540" y2="10" stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />
                  <line x1="0" y1="55" x2="540" y2="55" stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="540" y2="100" stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />
                  <line x1="0" y1="145" x2="540" y2="145" stroke="currentColor" className="text-border/80" />
                  <line x1="0" y1="190" x2="540" y2="190" stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />

                  {/* Profit Line Area */}
                  <path
                    d="M 15 155 L 55 140 L 95 185 L 140 105 L 180 145 L 225 110 L 270 145 L 315 105 L 360 65 L 405 20 L 450 185 L 495 170 L 495 200 L 15 200 Z"
                    fill="url(#profitGrad)"
                  />

                  {/* Profit Curve Line (Accent color) */}
                  <path
                    d="M 15 155 L 55 140 L 95 185 L 140 105 L 180 145 L 225 110 L 270 145 L 315 105 L 360 65 L 405 20 L 450 185 L 495 170"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points / Markers */}
                  {[
                    { x: 15, y: 155 },
                    { x: 55, y: 140 },
                    { x: 95, y: 185 },
                    { x: 140, y: 105 },
                    { x: 180, y: 145 },
                    { x: 225, y: 110 },
                    { x: 270, y: 145 },
                    { x: 315, y: 105 },
                    { x: 360, y: 65 },
                    { x: 405, y: 20 },
                    { x: 450, y: 185 },
                    { x: 495, y: 170 },
                  ].map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="#0f172a"
                      stroke="#f97316"
                      strokeWidth="2"
                    />
                  ))}
                </svg>

                {/* X-axis months labels */}
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground pt-2 px-1">
                  {metrics.netProfitTrend.map((m) => (
                    <span key={m.month}>{m.month}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: BUSINESS INTELLIGENCE (Screenshot 3) */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground border-border px-2.5 py-0.5 rounded-md">
            BUSINESS INTELLIGENCE
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: 2 KPI Cards (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* EST. RUNWAY */}
            <Card className="border-border shadow-sm bg-card flex-1">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    EST. RUNWAY
                  </span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-foreground tracking-tight font-mono">
                      {metrics.estRunwayMonths}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">Months</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Time until cash depletion at current burn rate.
                </p>
              </CardContent>
            </Card>

            {/* AVG. MONTHLY BURN */}
            <Card className="border-border shadow-sm bg-card flex-1">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    AVG. MONTHLY BURN
                  </span>
                  <div className="mt-3">
                    <span className="text-3xl font-extrabold text-amber-500 tracking-tight font-mono">
                      ₹{(metrics.avgMonthlyBurn / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Average expenses over the last 3 months.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: CASHFLOW HEALTH (INFLOW VS BURN) (8 cols) */}
          <Card className="lg:col-span-8 border-border shadow-sm bg-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                  CASHFLOW HEALTH (INFLOW VS BURN)
                </h3>
              </div>

              {/* Bar + Net line Chart SVG */}
              <div className="h-60 w-full flex relative pt-2">
                {/* Y-axis labels matching Screenshot 3: ₹285k, ₹190k, ₹95k, ₹0k, -₹95k */}
                <div className="w-12 flex flex-col justify-between text-[11px] font-mono text-muted-foreground text-right pr-2 select-none">
                  <span>₹285k</span>
                  <span>₹190k</span>
                  <span>₹95k</span>
                  <span>₹0k</span>
                  <span>-₹95k</span>
                </div>

                <div className="flex-1 flex flex-col justify-between relative">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 500 180"
                    preserveAspectRatio="none"
                  >
                    {/* Gridlines */}
                    <line x1="0" y1="10" x2="500" y2="10" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                    <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                    <line x1="0" y1="130" x2="500" y2="130" stroke="currentColor" className="text-border/80" />
                    <line x1="0" y1="170" x2="500" y2="170" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />

                    {/* Bars matching Screenshot 3 */}
                    {/* Month 1: Jun (x: 40) */}
                    <rect x="35" y="90" width="14" height="40" rx="2" fill="#ffffff" />
                    <rect x="53" y="100" width="14" height="30" rx="2" fill="#475569" />

                    {/* Month 2: Jun 2 (x: 120) */}
                    <rect x="115" y="95" width="14" height="35" rx="2" fill="#ffffff" />
                    <rect x="133" y="95" width="14" height="35" rx="2" fill="#475569" />

                    {/* Month 3: Jul (x: 200) */}
                    <rect x="195" y="30" width="14" height="100" rx="2" fill="#ffffff" />
                    <rect x="213" y="45" width="14" height="85" rx="2" fill="#475569" />

                    {/* Month 4: Sep (x: 280) */}
                    <rect x="275" y="40" width="14" height="90" rx="2" fill="#ffffff" />
                    <rect x="293" y="65" width="14" height="65" rx="2" fill="#475569" />

                    {/* Month 5: Oct (x: 360) */}
                    <rect x="355" y="15" width="14" height="115" rx="2" fill="#ffffff" />
                    <rect x="373" y="50" width="14" height="80" rx="2" fill="#475569" />

                    {/* Month 6: Nov (x: 440) */}
                    <rect x="435" y="95" width="14" height="35" rx="2" fill="#ffffff" />
                    <rect x="453" y="85" width="14" height="45" rx="2" fill="#475569" />

                    {/* Net Overlay Trajectory Line (Orange) */}
                    <path
                      d="M 50 120 C 90 135, 130 145, 170 135 C 210 125, 270 100, 310 90 C 350 80, 390 80, 420 105 C 435 120, 450 135, 460 145"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                    />

                    {/* Markers on line */}
                    {[
                      { x: 50, y: 120 },
                      { x: 130, y: 140 },
                      { x: 210, y: 125 },
                      { x: 290, y: 105 },
                      { x: 370, y: 90 },
                      { x: 450, y: 145 },
                    ].map((m, idx) => (
                      <circle
                        key={idx}
                        cx={m.x}
                        cy={m.y}
                        r="4"
                        fill="#0f172a"
                        stroke="#f97316"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>

                  {/* X-axis months */}
                  <div className="flex justify-around text-[11px] font-medium text-muted-foreground pt-2">
                    {metrics.cashflowHealth.map((item, idx) => (
                      <span key={idx}>{item.month}</span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: Collection Status & Profitability Trend (Screenshot 4) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: COLLECTION STATUS (OUTSTANDING VS RECEIVED) (6 cols) */}
        <Card className="lg:col-span-6 border-border shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                COLLECTION STATUS (OUTSTANDING VS RECEIVED)
              </h3>
            </div>

            {/* Stacked Bars SVG */}
            <div className="h-60 w-full flex relative pt-2">
              <div className="w-12 flex flex-col justify-between text-[11px] font-mono text-muted-foreground text-right pr-2 select-none">
                <span>₹280k</span>
                <span>₹210k</span>
                <span>₹140k</span>
                <span>₹70k</span>
                <span>₹0k</span>
              </div>

              <div className="flex-1 flex flex-col justify-between relative">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 450 180"
                  preserveAspectRatio="none"
                >
                  <line x1="0" y1="10" x2="450" y2="10" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                  <line x1="0" y1="52" x2="450" y2="52" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                  <line x1="0" y1="95" x2="450" y2="95" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                  <line x1="0" y1="137" x2="450" y2="137" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                  <line x1="0" y1="180" x2="450" y2="180" stroke="currentColor" className="text-border/80" />

                  {/* Stacked Bars matching Screenshot 4 */}
                  {/* Month 1: Jun */}
                  <rect x="25" y="110" width="22" height="70" rx="2" fill="#ffffff" />

                  {/* Month 2: Jun */}
                  <rect x="95" y="125" width="22" height="55" rx="2" fill="#ffffff" />

                  {/* Month 3: Jul */}
                  <rect x="165" y="45" width="22" height="135" rx="2" fill="#ffffff" />

                  {/* Month 4: Sep (Stacked pending on top) */}
                  <rect x="235" y="55" width="22" height="125" rx="2" fill="#ffffff" />
                  <rect x="235" y="50" width="22" height="5" rx="1" fill="#475569" />

                  {/* Month 5: Oct */}
                  <rect x="305" y="20" width="22" height="160" rx="2" fill="#ffffff" />

                  {/* Month 6: Nov */}
                  <rect x="375" y="125" width="22" height="55" rx="2" fill="#ffffff" />
                </svg>

                {/* X-axis */}
                <div className="flex justify-around text-[11px] font-medium text-muted-foreground pt-2">
                  {metrics.collectionStatus.map((m, idx) => (
                    <span key={idx}>{m.month}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend at bottom */}
            <div className="flex items-center justify-center gap-6 pt-2 text-[11px] text-muted-foreground border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-600" />
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-white" />
                <span>Received</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: PROFITABILITY & EFFICIENCY TREND (6 cols) */}
        <Card className="lg:col-span-6 border-border shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                PROFITABILITY & EFFICIENCY TREND
              </h3>
            </div>

            {/* Dual Axis Chart */}
            <div className="h-60 w-full flex relative pt-2">
              {/* Left Y-axis (₹) */}
              <div className="w-12 flex flex-col justify-between text-[11px] font-mono text-muted-foreground text-right pr-2 select-none">
                <span>₹285k</span>
                <span>₹190k</span>
                <span>₹95k</span>
                <span>₹0k</span>
                <span>-₹95k</span>
              </div>

              {/* Chart SVG */}
              <div className="flex-1 flex flex-col justify-between relative">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 450 180"
                  preserveAspectRatio="none"
                >
                  <line x1="0" y1="10" x2="450" y2="10" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                  <line x1="0" y1="52" x2="450" y2="52" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                  <line x1="0" y1="95" x2="450" y2="95" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />
                  <line x1="0" y1="137" x2="450" y2="137" stroke="currentColor" className="text-border/80" />
                  <line x1="0" y1="180" x2="450" y2="180" stroke="currentColor" className="text-border/50" strokeDasharray="3 3" />

                  {/* Revenue (Dark Gray) & NetProfit (Accent) Bars matching Screenshot 4 */}
                  {/* Jan */}
                  <rect x="20" y="115" width="10" height="22" rx="2" fill="#334155" />
                  <rect x="33" y="137" width="10" height="12" rx="2" fill="#ef4444" />

                  {/* Mar */}
                  <rect x="90" y="105" width="10" height="32" rx="2" fill="#334155" />
                  <rect x="103" y="125" width="10" height="12" rx="2" fill="#ef4444" />

                  {/* May */}
                  <rect x="160" y="90" width="10" height="47" rx="2" fill="#334155" />
                  <rect x="173" y="115" width="10" height="22" rx="2" fill="#ef4444" />

                  {/* Jun */}
                  <rect x="230" y="70" width="10" height="67" rx="2" fill="#334155" />
                  <rect x="243" y="105" width="10" height="32" rx="2" fill="#ef4444" />

                  {/* Sep */}
                  <rect x="300" y="40" width="10" height="97" rx="2" fill="#334155" />
                  <rect x="313" y="85" width="10" height="52" rx="2" fill="#ef4444" />

                  {/* Nov */}
                  <rect x="370" y="25" width="10" height="112" rx="2" fill="#334155" />
                  <rect x="383" y="137" width="10" height="15" rx="2" fill="#ef4444" />

                  {/* White Margin Line Curve */}
                  <path
                    d="M 28 140 L 45 155 L 75 95 L 100 165 L 125 105 L 150 120 L 175 40 L 205 130 L 235 50 L 265 110 L 295 70 L 325 35 L 350 25 L 380 150"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Margin Circles */}
                  {[
                    { x: 28, y: 140 },
                    { x: 45, y: 155 },
                    { x: 75, y: 95 },
                    { x: 100, y: 165 },
                    { x: 125, y: 105 },
                    { x: 175, y: 40 },
                    { x: 205, y: 130 },
                    { x: 235, y: 50 },
                    { x: 265, y: 110 },
                    { x: 295, y: 70 },
                    { x: 325, y: 35 },
                    { x: 350, y: 25 },
                    { x: 380, y: 150 },
                  ].map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ))}
                </svg>

                {/* X-axis */}
                <div className="flex justify-around text-[11px] font-medium text-muted-foreground pt-2">
                  {metrics.profitabilityTrend.map((p, idx) => (
                    <span key={idx}>{p.month}</span>
                  ))}
                </div>
              </div>

              {/* Right Y-axis (%) */}
              <div className="w-10 flex flex-col justify-between text-[11px] font-mono text-muted-foreground text-left pl-2 select-none">
                <span>40%</span>
                <span>20%</span>
                <span>0%</span>
                <span>-20%</span>
                <span>-40%</span>
              </div>
            </div>

            {/* Legend at bottom */}
            <div className="flex items-center justify-center gap-6 pt-2 text-[11px] text-muted-foreground border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-white border border-slate-400" />
                <span>Margin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-500" />
                <span>NetProfit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-600" />
                <span>Revenue</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: Revenue by Service & Revenue by Client (Screenshot 5) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* REVENUE BY SERVICE (6 cols) */}
        <Card className="lg:col-span-6 border-border shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                REVENUE BY SERVICE
              </h3>
            </div>

            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative w-44 h-44">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" className="stroke-muted/40" strokeWidth="14" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#818cf8" strokeWidth="14" strokeDasharray="78 238" strokeDashoffset="0" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#34d399" strokeWidth="14" strokeDasharray="59 238" strokeDashoffset="-78" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#38bdf8" strokeWidth="14" strokeDasharray="43 238" strokeDashoffset="-137" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#fbbf24" strokeWidth="14" strokeDasharray="29 238" strokeDashoffset="-180" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#a78bfa" strokeWidth="14" strokeDasharray="29 238" strokeDashoffset="-209" fill="none" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] text-muted-foreground font-medium">Services</span>
                  <span className="text-sm font-bold font-mono text-foreground">₹15.75L</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 text-[11px] text-muted-foreground">
                {metrics.revenueByService.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name} ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* REVENUE BY CLIENT (6 cols) */}
        <Card className="lg:col-span-6 border-border shadow-sm bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                REVENUE BY CLIENT
              </h3>
            </div>

            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative w-44 h-44">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" className="stroke-muted/40" strokeWidth="14" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#60a5fa" strokeWidth="14" strokeDasharray="72 238" strokeDashoffset="0" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#34d399" strokeWidth="14" strokeDasharray="53 238" strokeDashoffset="-72" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#f472b6" strokeWidth="14" strokeDasharray="47 238" strokeDashoffset="-125" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#fb923c" strokeWidth="14" strokeDasharray="36 238" strokeDashoffset="-172" fill="none" />
                  <circle cx="50" cy="50" r="38" stroke="#a3e635" strokeWidth="14" strokeDasharray="30 238" strokeDashoffset="-208" fill="none" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] text-muted-foreground font-medium">Clients</span>
                  <span className="text-sm font-bold font-mono text-foreground">₹15.78L</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 text-[11px] text-muted-foreground">
                {metrics.revenueByClient.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name} ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* SECTION 5: Available Statements (Screenshot 6) */}
      {/* ======================================================== */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Available Statements</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download generated accounting audits, P&L statements, and tax reconciliations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">REPORT NAME</th>
                  <th className="py-3.5 px-4">PERIOD</th>
                  <th className="py-3.5 px-4">GENERATED</th>
                  <th className="py-3.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.availableStatements.map((statement) => (
                  <tr
                    key={statement.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {statement.format === 'PDF' ? (
                          <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="font-semibold text-foreground text-sm">
                          {statement.title}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      {statement.period}
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      {statement.generatedAt}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownload(statement)}
                        title="Download Statement"
                        className="rounded-lg h-8 w-8 border-border text-foreground hover:bg-muted"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

