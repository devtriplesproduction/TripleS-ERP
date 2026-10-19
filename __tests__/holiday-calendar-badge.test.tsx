import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HolidayManager, Holiday } from '@/components/modules/HolidayManager'

describe('HolidayManager Date Badge Typography', () => {
  const mockHolidays: Holiday[] = [
    {
      id: 'h-1',
      name: 'Independence Day',
      date: '2026-08-15',
      is_optional: false,
      holiday_type: 'PAID'
    },
    {
      id: 'h-2',
      name: 'Anant Chaturthi',
      date: '2026-09-30',
      is_optional: false,
      holiday_type: 'PAID'
    }
  ]

  it('renders date badges in grid view with font-medium (500) and preserves weekday label styling', () => {
    const html = renderToStaticMarkup(
      <HolidayManager initialHolidays={mockHolidays} isAdmin={false} />
    )

    // Check that date numbers inside badges use font-medium and not font-extrabold
    expect(html).toContain('text-sm sm:text-base font-medium text-primary leading-tight')
    expect(html).not.toContain('text-sm sm:text-base font-extrabold')

    // Check that weekday labels remain font-bold
    expect(html).toContain('text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-primary/70 leading-none')

    // Check that holiday names and date numbers are rendered properly
    expect(html).toContain('Independence Day')
    expect(html).toContain('Anant Chaturthi')
    expect(html).toContain('15')
    expect(html).toContain('30')
  })
})
