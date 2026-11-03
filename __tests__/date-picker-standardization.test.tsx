import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DatePicker } from '@/components/ui/date-picker'

describe('DatePicker Component Standardization (DD/MM/YYYY)', () => {
  it('renders ISO date "2026-11-03" as "03/11/2026"', () => {
    const html = renderToStaticMarkup(<DatePicker value="2026-11-03" />)
    expect(html).toContain('03/11/2026')
    expect(html).not.toContain('11/03/2026')
  })

  it('renders ISO date "2026-03-11" as "11/03/2026"', () => {
    const html = renderToStaticMarkup(<DatePicker value="2026-03-11" />)
    expect(html).toContain('11/03/2026')
    expect(html).not.toContain('03/11/2026')
  })

  it('renders ISO date "2026-02-01" as "01/02/2026"', () => {
    const html = renderToStaticMarkup(<DatePicker value="2026-02-01" />)
    expect(html).toContain('01/02/2026')
  })

  it('correctly accepts and displays DD/MM/YYYY input strings without day/month swapping', () => {
    const html1 = renderToStaticMarkup(<DatePicker value="03/11/2026" />)
    expect(html1).toContain('03/11/2026')

    const html2 = renderToStaticMarkup(<DatePicker value="11/03/2026" />)
    expect(html2).toContain('11/03/2026')

    const html3 = renderToStaticMarkup(<DatePicker value="01/02/2026" />)
    expect(html3).toContain('01/02/2026')
  })

  it('renders Date object input in DD/MM/YYYY format', () => {
    const date = new Date(2026, 10, 3) // Month index 10 = November
    const html = renderToStaticMarkup(<DatePicker value={date} />)
    expect(html).toContain('03/11/2026')
  })

  it('renders readable format when displayFormat="DD MMM YYYY"', () => {
    const html = renderToStaticMarkup(<DatePicker value="2026-11-03" displayFormat="DD MMM YYYY" />)
    expect(html).toContain('03 Nov 2026')
  })

  it('defaults placeholder to "dd/mm/yyyy"', () => {
    const html = renderToStaticMarkup(<DatePicker />)
    expect(html).toContain('dd/mm/yyyy')
  })
})

