'use client'

import React, { useState } from 'react'
import {
  Layers,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  FolderKanban,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ContentCategory, ContentTag, ContentItem } from '@/types/content-management'
import {
  createContentCategory,
  updateContentCategory,
  toggleContentCategoryStatus,
  deleteContentCategory,
  createContentTag,
  deleteContentTag,
} from '@/lib/actions/content-management'
import { useToast } from '@/hooks/use-toast'

interface CategoriesTagsSectionProps {
  categories: ContentCategory[]
  tags: ContentTag[]
  items: ContentItem[]
  isAuthorizedManager: boolean
  onCategoriesUpdated: (updated: ContentCategory[]) => void
  onTagsUpdated: (updated: ContentTag[]) => void
}

export function CategoriesTagsSection({
  categories = [],
  tags = [],
  items = [],
  isAuthorizedManager,
  onCategoriesUpdated,
  onTagsUpdated,
}: CategoriesTagsSectionProps) {
  const { toast } = useToast()

  const safeCategories = categories || []
  const safeTags = tags || []
  const safeItems = items || []

  // Categories Form State
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [editingCatDesc, setEditingCatDesc] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')

  // Tags Form State
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [tagLoading, setTagLoading] = useState(false)
  const [tagSearch, setTagSearch] = useState('')

  const PRESET_COLORS = [
    '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
    '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'
  ]

  // Category Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) {
      toast({ title: 'Validation Error', description: 'Category name is required.', variant: 'destructive' })
      return
    }

    setCategoryLoading(true)
    try {
      const res = await createContentCategory(newCatName.trim(), newCatDesc.trim(), newCatColor)
      if (res.success && res.data) {
        toast({ title: 'Category Created', description: `Category "${res.data.name}" added successfully.` })
        onCategoriesUpdated([...safeCategories, res.data])
        setNewCatName('')
        setNewCatDesc('')
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to create category.', variant: 'destructive' })
      }
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleUpdateCategory = async (id: string) => {
    if (!editingCatName.trim()) return
    setCategoryLoading(true)
    try {
      const res = await updateContentCategory(id, editingCatName.trim(), editingCatDesc.trim())
      if (res.success && res.data) {
        toast({ title: 'Category Updated', description: 'Category modified successfully.' })
        onCategoriesUpdated(safeCategories.map(c => c.id === id ? res.data! : c))
        setEditingCatId(null)
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to update category.', variant: 'destructive' })
      }
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleToggleCategory = async (id: string) => {
    try {
      const res = await toggleContentCategoryStatus(id)
      if (res.success && res.data) {
        onCategoriesUpdated(safeCategories.map(c => c.id === id ? res.data! : c))
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle status.', variant: 'destructive' })
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const usageCount = safeItems.filter(i => i.category === name).length
    if (usageCount > 0) {
      const proceed = window.confirm(
        `Category "${name}" is currently referenced by ${usageCount} document(s). Are you sure you want to delete it?`
      )
      if (!proceed) return
    }

    try {
      const res = await deleteContentCategory(id, name)
      if (res.success) {
        toast({ title: 'Category Deleted', description: `Category "${name}" was removed.` })
        onCategoriesUpdated(safeCategories.filter(c => c.id !== id && c.name !== name))
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to delete category.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' })
    }
  }

  // Tag Handlers
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) {
      toast({ title: 'Validation Error', description: 'Tag name is required.', variant: 'destructive' })
      return
    }

    setTagLoading(true)
    try {
      const res = await createContentTag(newTagName.trim(), newTagColor)
      if (res.success && res.data) {
        toast({ title: 'Tag Created', description: `Tag "#${res.data.name}" added successfully.` })
        onTagsUpdated([...safeTags, res.data])
        setNewTagName('')
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to create tag.', variant: 'destructive' })
      }
    } finally {
      setTagLoading(false)
    }
  }

  const handleDeleteTag = async (id: string, name: string) => {
    try {
      const res = await deleteContentTag(id, name)
      if (res.success) {
        toast({ title: 'Tag Deleted', description: `Tag "#${name}" was removed.` })
        onTagsUpdated(safeTags.filter(t => t.id !== id && t.name !== name))
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to delete tag.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete tag.', variant: 'destructive' })
    }
  }

  const filteredCategories = safeCategories.filter(c =>
    (c.name || '').toLowerCase().includes(categorySearch.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(categorySearch.toLowerCase()))
  )

  const filteredTags = safeTags.filter(t =>
    (t.name || '').toLowerCase().includes(tagSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Taxonomy, Categories & Tag Organization</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Organize content across project hierarchies, functional domains, and cross-cutting architectural tags with automated duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs py-1 px-2.5">
            {categories.length} Categories
          </Badge>
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs py-1 px-2.5">
            {tags.length} Active Tags
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT: CATEGORIES (7 cols) ================= */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-zinc-800 bg-zinc-950/60">
            <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Content Categories</span>
              </CardTitle>
              <div className="w-48">
                <Input
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Filter categories..."
                  className="h-8 text-xs bg-zinc-900 border-zinc-800"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Add Category Form (For Authorized Managers) */}
              {isAuthorizedManager && (
                <form onSubmit={handleCreateCategory} className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                    Create New Category
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category name (e.g. Architecture)"
                      className="h-8 text-xs bg-zinc-950 border-zinc-800"
                    />
                    <Input
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Short description / purpose"
                      className="h-8 text-xs bg-zinc-950 border-zinc-800"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400 mr-1">Color:</span>
                      {PRESET_COLORS.slice(0, 6).map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCatColor(color)}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            newCatColor === color ? 'scale-125 border-white ring-1 ring-white/50' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <Button
                      type="submit"
                      disabled={categoryLoading}
                      size="sm"
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Category
                    </Button>
                  </div>
                </form>
              )}

              {/* Categories Listing */}
              <div className="space-y-2">
                {filteredCategories.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No categories found matching query.
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const count = safeItems.filter(i => i.category === cat.name).length
                    const isEditing = editingCatId === cat.id

                    return (
                      <div
                        key={cat.id || cat.name}
                        className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || '#6366f1' }}
                          />

                          {isEditing ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                className="h-7 text-xs bg-zinc-950 border-zinc-800 flex-1"
                              />
                              <Input
                                value={editingCatDesc}
                                onChange={(e) => setEditingCatDesc(e.target.value)}
                                className="h-7 text-xs bg-zinc-950 border-zinc-800 flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdateCategory(cat.id)}
                                className="h-7 px-2 text-xs bg-emerald-600 text-white"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCatId(null)}
                                className="h-7 px-2 text-xs"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <strong className="text-zinc-200 text-xs font-semibold">{cat.name}</strong>
                                {!cat.is_active && (
                                  <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              {cat.description && (
                                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{cat.description}</p>
                              )}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                              {count} Doc{count === 1 ? '' : 's'}
                            </Badge>

                            {isAuthorizedManager && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategory(cat.id)}
                                  className="text-zinc-400 hover:text-zinc-200 p-1"
                                  title={cat.is_active ? 'Disable Category' : 'Enable Category'}
                                >
                                  {cat.is_active ? (
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <ToggleLeft className="w-4 h-4 text-zinc-500" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCatId(cat.id)
                                    setEditingCatName(cat.name)
                                    setEditingCatDesc(cat.description || '')
                                  }}
                                  className="text-zinc-400 hover:text-zinc-200 p-1"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  className="text-zinc-400 hover:text-rose-400 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= RIGHT: TAGS (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-zinc-800 bg-zinc-950/60">
            <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span>Content Tags</span>
              </CardTitle>
              <div className="w-36">
                <Input
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Filter tags..."
                  className="h-8 text-xs bg-zinc-900 border-zinc-800"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Add Tag Form (For Authorized Managers) */}
              {isAuthorizedManager && (
                <form onSubmit={handleCreateTag} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2.5">
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                    Create Master Tag
                  </span>
                  <div className="flex gap-2">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag label (e.g. Microservices)"
                      className="h-8 text-xs bg-zinc-950 border-zinc-800 flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={tagLoading}
                      size="sm"
                      className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Tag
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-zinc-400 mr-1">Color:</span>
                    {PRESET_COLORS.slice(0, 6).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-4 h-4 rounded-full border transition-transform ${
                          newTagColor === color ? 'scale-125 border-white ring-1 ring-white/50' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </form>
              )}

              {/* Tags Cloud / List */}
              <div className="flex flex-wrap gap-2 pt-1">
                {filteredTags.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 w-full">
                    No tags found.
                  </div>
                ) : (
                  filteredTags.map((tag) => {
                    const count = safeItems.filter(i => Array.isArray(i.tags) && i.tags.includes(tag.name)).length
                    return (
                      <div
                        key={tag.id || tag.name}
                        className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/80 flex items-center gap-2 text-xs group transition-all hover:border-zinc-700"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || '#3b82f6' }}
                        />
                        <span className="font-medium text-zinc-200">#{tag.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">({count})</span>
                        {isAuthorizedManager && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(tag.id, tag.name)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-opacity ml-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

