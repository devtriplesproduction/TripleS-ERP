import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OnboardingTable } from '@/components/hr/onboarding/onboarding-table'
import { useAnimatedPlaceholder } from '@/hooks/use-animated-placeholder'

// Mock supabase client for OnboardingTable render
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock-storage/${path}` } })
      })
    }
  })
}))

describe('Animated Placeholder on Employee Search', () => {
  it('renders initial animated placeholder on employee search input', () => {
    const html = renderToStaticMarkup(React.createElement(OnboardingTable, { employees: [] }))
    
    // Initial placeholder should be rendered cleanly
    expect(html).toContain('placeholder="Search by name..."')
  })

  it('hook returns first phrase immediately on initial call', () => {
    function DummyComponent() {
      const placeholder = useAnimatedPlaceholder(['Search by name...', 'Search by email...'])
      return React.createElement('input', { placeholder, readOnly: true })
    }

    const html = renderToStaticMarkup(React.createElement(DummyComponent))
    expect(html).toContain('placeholder="Search by name..."')
  })
})
