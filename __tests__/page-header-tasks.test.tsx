import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PageHeader, getPageHeaderIcon } from '@/components/PageHeader'
import {
  LayoutDashboard,
  Clock,
  UserPlus,
  Users,
  Settings,
  CheckSquare,
  ListTodo,
  ClipboardList,
  FileText,
  Building2,
  FolderKanban,
  CalendarDays,
  CalendarCheck2,
  Calendar,
  CreditCard,
  Megaphone,
  BookOpen,
  StickyNote,
  Star,
  Shield,
} from 'lucide-react'

describe('PageHeader Component and Design System', () => {
  it('renders title, subtitle, and standardized 56px rounded-square container with 20px icon', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Dashboard"
        subtitle="Real-time operations overview"
      />
    )

    // Check title and subtitle
    expect(html).toContain('Dashboard')
    expect(html).toContain('Real-time operations overview')

    // Standardized container styling (56px container w-14 h-14, rounded-2xl, bg-card, border-border, shadow-xs)
    expect(html).toContain('w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0 shadow-xs')

    // Standardized icon styling (20px icon w-5 h-5, stroke-[1.75], text-foreground)
    expect(html).toContain('w-5 h-5')
    expect(html).toContain('stroke-[1.75]')
    expect(html).toContain('text-foreground')

    // Typography hierarchy (font-bold, tracking-tight, leading-tight)
    expect(html).toContain('text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight truncate')
  })

  it('renders actions and custom icon when explicitly provided', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Security Center"
        icon={Shield}
        actions={<button id="test-action-btn">Action Button</button>}
      />
    )

    expect(html).toContain('Security Center')
    expect(html).toContain('Action Button')
    expect(html).toContain('id="test-action-btn"')
  })

  describe('getPageHeaderIcon icon resolver', () => {
    it('returns custom icon when passed as PropIcon', () => {
      expect(getPageHeaderIcon('Arbitrary Title', Shield)).toBe(Shield)
    })

    it('resolves correct Lucide icon for each core module keyword', () => {
      expect(getPageHeaderIcon('Admin Dashboard')).toBe(LayoutDashboard)
      expect(getPageHeaderIcon('Time Tracking')).toBe(Clock)
      expect(getPageHeaderIcon('Activity Tracker')).toBe(Clock)
      expect(getPageHeaderIcon('Onboard New Employee')).toBe(UserPlus)
      expect(getPageHeaderIcon('Employees Directory')).toBe(Users)
      expect(getPageHeaderIcon('Settings & Profile')).toBe(Settings)
      expect(getPageHeaderIcon('Quick Tasks')).toBe(CheckSquare)
      expect(getPageHeaderIcon('My Tasks')).toBe(ListTodo)
      expect(getPageHeaderIcon('Tasks Board')).toBe(CheckSquare)
      expect(getPageHeaderIcon('EOD Reports')).toBe(ClipboardList)
      expect(getPageHeaderIcon('Reports & Analytics')).toBe(FileText)
      expect(getPageHeaderIcon('Company Directory')).toBe(Building2)
      expect(getPageHeaderIcon('Projects List')).toBe(FolderKanban)
      expect(getPageHeaderIcon('Holiday Calendar')).toBe(CalendarDays)
      expect(getPageHeaderIcon('Attendance Logs')).toBe(CalendarCheck2)
      expect(getPageHeaderIcon('Leave Requests')).toBe(Calendar)
      expect(getPageHeaderIcon('Payroll Processing')).toBe(CreditCard)
      expect(getPageHeaderIcon('Company Announcements')).toBe(Megaphone)
      expect(getPageHeaderIcon('Company Rulebook')).toBe(BookOpen)
      expect(getPageHeaderIcon('Personal Notes')).toBe(StickyNote)
      expect(getPageHeaderIcon('Unknown Custom Page')).toBe(Star)
    })
  })
})
