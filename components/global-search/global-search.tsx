'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Loader2, Users, Briefcase, CheckSquare, Building, Calendar, FileText, Bell, BookOpen, FileCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { globalSearchAction, SearchResult, SearchCategory } from '@/actions/search.actions'
import { useDebounce } from '@/hooks/use-debounce'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const router = useRouter()
  const debouncedQuery = useDebounce(query, 300)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
      if (open && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % results.length)
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex].url)
          }
        }
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, results, selectedIndex])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setResults([])
      setLoading(false)
      setSelectedIndex(0)
      return
    }

    const fetchResults = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await globalSearchAction(debouncedQuery)
        setResults(data)
        setSelectedIndex(0)
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to fetch results.')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery])

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = []
    }
    acc[result.category].push(result)
    return acc
  }, {} as Record<SearchCategory, SearchResult[]>)

  // Create a flattened array of results that matches the display order
  const displayResults: SearchResult[] = []
  Object.values(groupedResults).forEach(group => {
    displayResults.push(...group)
  })

  // Update selected index to be based on the flattened array
  const currentSelectedItem = displayResults[selectedIndex]

  const categoryIcons: Record<SearchCategory, React.ReactNode> = {
    EMPLOYEES: <Users className="h-4 w-4 text-blue-500" />,
    PROJECTS: <Briefcase className="h-4 w-4 text-indigo-500" />,
    TASKS: <CheckSquare className="h-4 w-4 text-emerald-500" />,
    CLIENTS: <Building className="h-4 w-4 text-orange-500" />,
    EOD_REPORTS: <FileText className="h-4 w-4 text-purple-500" />,
    LEAVE: <Calendar className="h-4 w-4 text-pink-500" />,
    ANNOUNCEMENTS: <Bell className="h-4 w-4 text-yellow-500" />,
    RULEBOOK: <BookOpen className="h-4 w-4 text-teal-500" />,
    DOCUMENTS: <FileCheck className="h-4 w-4 text-slate-500" />
  }

  const handleSelect = (url: string) => {
    setOpen(false)
    router.push(url)
  }

  return (
    <>
      <div 
        className="hidden md:flex relative w-60 lg:w-80 max-w-full cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <div 
          className="w-full bg-input/50 border border-border pl-10 pr-12 rounded-lg h-9 text-sm flex items-center text-muted-foreground hover:bg-input/70 transition-colors overflow-hidden"
        >
          <span className="truncate">Search employees, tasks, documents...</span>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <kbd className="inline-flex items-center rounded border border-border px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[15vh]">
          <div 
            className="fixed inset-0" 
            onClick={() => setOpen(false)} 
          />
          <div className="relative z-50 w-full max-w-2xl bg-popover rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[70vh]">
            
            {/* Search Input */}
            <div className="flex items-center px-4 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground mr-3" />
              <input
                ref={searchInputRef}
                className="flex-1 bg-transparent h-14 outline-none text-foreground placeholder:text-muted-foreground text-lg"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-3">
                ESC
              </kbd>
            </div>

            {/* Results Area */}
            <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
              {!query ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <p>Search across employees, projects, tasks, and more.</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {['EMPLOYEES', 'PROJECTS', 'TASKS', 'LEAVE'].map(cat => (
                      <span key={cat} className="px-2 py-1 bg-muted rounded-md text-xs font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              ) : loading && results.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  Searching...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-sm text-red-500">
                  {error}
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No results found for &quot;{query}&quot;
                </div>
              ) : (
                <div className="space-y-4 pb-2">
                  {Object.entries(groupedResults).map(([category, items]) => (
                    <div key={category} className="px-2">
                      <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider mb-1">
                        {category.replace('_', ' ')}
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => {
                          const isSelected = currentSelectedItem?.id === item.id
                          return (
                            <button
                              key={item.id}
                              className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-lg outline-none transition-colors group ${
                                isSelected ? 'bg-muted' : 'hover:bg-muted focus:bg-muted'
                              }`}
                              onClick={() => handleSelect(item.url)}
                            >
                              <div className={`mt-0.5 border rounded-md p-1.5 transition-colors flex items-center justify-center w-8 h-8 ${
                                isSelected ? 'bg-background border-muted-foreground/30' : 'bg-background border-border group-hover:border-muted-foreground/30'
                              }`}>
                                {item.avatar ? (
                                  <img src={item.avatar} alt={item.title} className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  categoryIcons[item.category as SearchCategory]
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {item.title}
                                </div>
                                {item.subtitle && (
                                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
