'use client'

import React, { useState } from 'react'
import {
  Search,
  Filter,
  X,
  Calendar,
  Layers,
  Tag,
  FolderKanban,
  User,
  ArrowUpDown,
  Eye,
  Edit,
  Clock,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ContentItem,
  ContentType,
  ContentCategory,
  ContentTag,
  computeDeadlineState,
  computeFreshnessState,
} from '@/types/content-management'
import { Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'
import dayjs from 'dayjs'

interface AdvancedSearchFilterSectionProps {
  items: ContentItem[]
  contentTypes?: ContentType[]
  types?: ContentType[]
  categories: ContentCategory[]
  tags: ContentTag[]
  projects: Project[]
  employees: AssignableEmployee[]
  onViewItem: (item: ContentItem) => void
  onEditItem: (item: ContentItem) => void
  onSubmitForReview?: (item: ContentItem) => Promise<void> | void
  onPublish?: (item: ContentItem) => Promise<void> | void
}

export function AdvancedSearchFilterSection({
  items,
  contentTypes: propContentTypes,
  types: propTypes,
  categories,
  tags,
  projects,
  employees,
  onViewItem,
  onEditItem,
  onSubmitForReview,
  onPublish,
}: AdvancedSearchFilterSectionProps) {
  const contentTypes = propContentTypes || propTypes || []
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedType, setSelectedType] = useState<string>('All')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedTag, setSelectedTag] = useState<string>('All')
  const [selectedProject, setSelectedProject] = useState<string>('All')
  const [selectedDeveloper, setSelectedDeveloper] = useState<string>('All')
  const [selectedOwner, setSelectedOwner] = useState<string>('All')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [sortBy, setSortBy] = useState<'newest' | 'last_updated' | 'due_date' | 'title'>('newest')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedStatus('All')
    setSelectedType('All')
    setSelectedCategory('All')
    setSelectedTag('All')
    setSelectedProject('All')
    setSelectedDeveloper('All')
    setSelectedOwner('All')
    setStartDate('')
    setEndDate('')
    setSortBy('newest')
    setSortOrder('desc')
  }

  // Active filter counting
  const activeFilterCount = [
    searchQuery,
    selectedStatus !== 'All',
    selectedType !== 'All',
    selectedCategory !== 'All',
    selectedTag !== 'All',
    selectedProject !== 'All',
    selectedDeveloper !== 'All',
    selectedOwner !== 'All',
    startDate,
    endDate,
  ].filter(Boolean).length

  // Filtering Logic
  const filteredItems = items.filter(item => {
    // 1. Search Query: Title & relevant metadata (summary, body, owner, assignee, tags, category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const titleMatch = item.title.toLowerCase().includes(q)
      const summaryMatch = item.summary && item.summary.toLowerCase().includes(q)
      const bodyMatch = item.body && item.body.toLowerCase().includes(q)
      const ownerMatch = item.owner_name.toLowerCase().includes(q)
      const assigneeMatch = item.assigned_to_name && item.assigned_to_name.toLowerCase().includes(q)
      const projectMatch = item.project_name && item.project_name.toLowerCase().includes(q)
      const categoryMatch = item.category && item.category.toLowerCase().includes(q)
      const tagMatch = item.tags && item.tags.some(t => t.toLowerCase().includes(q))

      if (!titleMatch && !summaryMatch && !bodyMatch && !ownerMatch && !assigneeMatch && !projectMatch && !categoryMatch && !tagMatch) {
        return false
      }
    }

    // 2. Status
    if (selectedStatus !== 'All' && item.status !== selectedStatus) return false

    // 3. Content Type
    if (selectedType !== 'All' && item.content_type !== selectedType) return false

    // 4. Category
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false

    // 5. Tag
    if (selectedTag !== 'All' && (!item.tags || !item.tags.includes(selectedTag))) return false

    // 6. Project
    if (selectedProject !== 'All' && item.project_id !== selectedProject) return false

    // 7. Developer / Assignee
    if (selectedDeveloper !== 'All' && item.assigned_to_id !== selectedDeveloper) return false

    // 8. Owner
    if (selectedOwner !== 'All' && item.owner_id !== selectedOwner) return false

    // 9. Date Range (Creation Date)
    if (startDate) {
      const startMs = new Date(startDate).getTime()
      if (new Date(item.created_at).getTime() < startMs) return false
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + (24 * 60 * 60 * 1000)
      if (new Date(item.created_at).getTime() > endMs) return false
    }

    return true
  })

  // Sorting Logic
  filteredItems.sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'newest':
        cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        break
      case 'last_updated':
        cmp = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        break
      case 'due_date': {
        const aDue = a.due_date ? new Date(a.due_date).getTime() : 9999999999999
        const bDue = b.due_date ? new Date(b.due_date).getTime() : 9999999999999
        cmp = aDue - bDue
        break
      }
      case 'title':
        cmp = a.title.localeCompare(b.title)
        break
    }
    return sortOrder === 'desc' ? cmp : -cmp
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Published':
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Published</Badge>
      case 'Approved':
        return <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30">Approved</Badge>
      case 'In Review':
        return <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30">In Review</Badge>
      case 'Changes Requested':
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Changes Requested</Badge>
      case 'Draft':
        return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30">Draft</Badge>
      case 'Rejected':
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">Rejected</Badge>
      case 'Archived':
        return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30">Archived</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Banner */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            <span>Multi-Facet Search & Filter Explorer</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Query across title and full document metadata, project ownership, tags, categories, developer assignments, and date ranges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters ({activeFilterCount})
            </Button>
          )}

          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs py-1 px-3">
            {filteredItems.length} of {items.length} Matched
          </Badge>
        </div>
      </div>

      {/* Filter Matrix Card */}
      <Card className="border-zinc-800 bg-zinc-950/60">
        <CardContent className="p-5 space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, overview summary, markdown body, author name, or tags..."
              className="h-10 pl-10 text-xs bg-zinc-900/80 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Status */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Changes Requested">Changes Requested</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published</option>
                <option value="Rejected">Rejected</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {/* Content Type */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Content Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Types</option>
                {contentTypes.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tag */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Tag
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>#{t.name}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Developer / Assignee */}
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Assignee / Developer
              </label>
              <select
                value={selectedDeveloper}
                onChange={(e) => setSelectedDeveloper(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="All">All Developers</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range & Sort Controls */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                Date Range:
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-7 text-xs bg-zinc-900 border-zinc-800 w-32"
                placeholder="From"
              />
              <span className="text-zinc-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-7 text-xs bg-zinc-900 border-zinc-800 w-32"
                placeholder="To"
              />
            </div>

            {/* Sorting controls */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-7 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="newest">Newest Created</option>
                <option value="last_updated">Last Updated</option>
                <option value="due_date">Due Date</option>
                <option value="title">Title (Alphabetical)</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-7 px-2 text-xs border-zinc-800 text-zinc-300"
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Listing / Clear Empty State */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-12 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">No Content Matches Search & Filter Criteria</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                No technical articles, user guides, or documentation assets found matching your active filter configuration.
              </p>
            </div>
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                onClick={handleResetFilters}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs mt-2"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Clear All Search & Filter Conditions
              </Button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const deadlineState = computeDeadlineState(item.due_date, item.status)
            const freshnessState = computeFreshnessState(item)

            return (
              <div
                key={item.id}
                className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl hover:border-zinc-700 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">{item.id}</span>
                    <span className="text-zinc-600">&bull;</span>
                    {getStatusBadge(item.status)}
                    <span className="text-zinc-600">&bull;</span>
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                      {item.content_type}
                    </Badge>
                    {item.category && (
                      <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">
                        {item.category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700 font-mono">
                      v{item.version || 1}.0
                    </Badge>
                  </div>

                  <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span>Created: {dayjs(item.created_at).format('DD MMM YYYY')}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-100 hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => onViewItem(item)}>
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{item.summary}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
                  <div className="flex flex-wrap items-center gap-4">
                    <span>Project: <strong className="text-zinc-200">{item.project_name || 'General Operations'}</strong></span>
                    <span>Author: <strong className="text-zinc-200">{item.owner_name}</strong></span>
                    {item.assigned_to_name && (
                      <span>Assignee: <strong className="text-indigo-400">{item.assigned_to_name}</strong></span>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1">
                        {item.tags.slice(0, 3).map((t, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-zinc-900 text-zinc-400 rounded border border-zinc-800">
                            #{t}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-[10px] text-zinc-500 font-mono">+{item.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewItem(item)}
                      className="h-7 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onEditItem(item)}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

