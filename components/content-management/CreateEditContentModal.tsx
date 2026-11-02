'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Megaphone,
  Calendar,
  Save,
  Send,
  Eye,
  Edit3,
  X,
  Tag,
  Loader2,
  FolderKanban,
  User,
  UserCheck,
  Columns,
  Sparkles,
  GitBranch,
  Layers,
  UploadCloud,
  Paperclip,
  Trash2,
  Target,
  Share2,
  Hash,
  Palette,
  Check,
  Plus,
  Clock,
  Smartphone,
  Laptop,
  Video,
  MessageSquare,
  ThumbsUp,
  ExternalLink,
  Bookmark,
  BarChart3,
  Building,
  Radio,
  FileText,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ContentItem,
  ContentType,
  ContentCategory,
  ContentTag,
  ContentPriority,
  AssignedRole,
  CreateContentInput,
  UpdateContentInput,
} from '@/types/content-management'
import { Project } from '@/types/project-management'
import { AssignableEmployee } from '@/lib/actions/team'

interface CreateEditContentModalProps {
  isOpen: boolean
  onClose: () => void
  item?: ContentItem | null
  contentTypes: ContentType[]
  categories?: ContentCategory[]
  availableCategories?: ContentCategory[]
  tags?: (ContentTag | string)[]
  availableTags?: (ContentTag | string)[]
  projects: Project[]
  employees: AssignableEmployee[]
  currentUserId?: string
  currentUserName?: string
  onSubmit: (input: CreateContentInput | UpdateContentInput, statusToSave: 'Draft' | 'In Review') => Promise<void>
}

// Digital Marketing Agency Content Types
const AGENCY_CONTENT_TYPES = [
  'Social Media Post (Instagram / LinkedIn / Facebook / X)',
  'Short Video Script (Reels / TikTok / Shorts)',
  'Paid Ad Copy (Meta Ads / Google Ads / LinkedIn)',
  'SEO Blog Post & Article',
  'Email Newsletter / Sequence',
  'Landing Page & Website Copy',
  'Carousel & Infographic Multi-Slide',
  'Case Study & Client Proof',
  'Press Release & PR Announcement',
  'Influencer Brief & Collaboration',
]

// Backward-compatible specification types
const SPEC_CONTENT_TYPES = [
  ...AGENCY_CONTENT_TYPES,
  'Technical Doc',
  'Project Doc',
  'API Doc',
  'User Guide',
  'Developer Guide',
  'Release Notes',
  'Knowledge Base',
  'FAQ',
]

// Target Distribution Channels & Platforms
const MARKETING_PLATFORMS = [
  { id: 'Instagram', name: 'Instagram', icon: '📸', color: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
  { id: 'LinkedIn', name: 'LinkedIn', icon: '💼', color: 'border-sky-500/40 text-sky-400 bg-sky-500/10' },
  { id: 'Meta Ads', name: 'Meta Ads (FB/IG)', icon: '🎯', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  { id: 'TikTok', name: 'TikTok', icon: '🎵', color: 'border-zinc-500/40 text-zinc-300 bg-zinc-500/10' },
  { id: 'X (Twitter)', name: 'X / Twitter', icon: '𝕏', color: 'border-zinc-700 text-zinc-300 bg-zinc-800/40' },
  { id: 'YouTube', name: 'YouTube', icon: '▶️', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
  { id: 'Google Ads', name: 'Google Ads', icon: '🔍', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  { id: 'Email', name: 'Email Sequence', icon: '✉️', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
  { id: 'Website/Blog', name: 'Website / SEO Blog', icon: '🌐', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
]

// Marketing Funnel Objectives
const MARKETING_OBJECTIVES = [
  'Direct Sales & Conversions (Bottom of Funnel)',
  'Lead Generation & Inbound Acquisition',
  'Brand Awareness & Reach (Top of Funnel)',
  'Community Engagement & Virality',
  'Customer Retention & Upsell',
  'Event / Webinar Registration',
]

// Tones of Voice
const TONES_OF_VOICE = [
  'High-Energy & Urgent (FOMO)',
  'Professional & Authoritative',
  'Casual, Relatable & Conversational',
  'Educational & Value-First',
  'Witty, Bold & Disruptive',
  'Inspirational & Story-Driven',
]

// Creative Asset Formats
const CREATIVE_FORMATS = [
  '1:1 Square Feed (1080x1080)',
  '9:16 Vertical Story / Reel / TikTok (1080x1920)',
  '16:9 Landscape Video / Banner (1920x1080)',
  '4:5 Portrait Feed (1080x1350)',
  'Carousel Multi-Slide (PDF/Images)',
  'Responsive Search / Display Ad',
  'Copy Only (No Visual Asset)',
]

// Preset Quick CTAs
const QUICK_CTAS = [
  'Shop Now with 20% OFF',
  'Claim Free Growth Audit',
  'Book a Strategy Call',
  'Link in Bio to Learn More',
  'Download Free Guide',
  'Comment "SCALE" Below',
  'Start Your 14-Day Free Trial',
]

// Preset Quick Agency Hashtags
const QUICK_AGENCY_HASHTAGS = [
  '#DigitalMarketing',
  '#GrowthHacking',
  '#MarketingStrategy',
  '#B2BMarketing',
  '#SocialMediaMarketing',
  '#ContentCreator',
  '#LeadGeneration',
  '#EcommerceGrowth',
  '#BrandStrategy',
]

// Preset Sample Clients for Agency
const PRESET_CLIENTS = [
  'Apex Retail Global',
  'Nimbus Cloud SaaS',
  'Volt Mobility',
  'Zenith Health & Fitness',
  'Lumina Luxury Apparel',
  'TripleS ERP In-House',
]

export function CreateEditContentModal({
  isOpen,
  onClose,
  item,
  contentTypes,
  categories: propCats,
  availableCategories,
  tags: propTags,
  availableTags,
  projects,
  employees,
  currentUserId,
  currentUserName,
  onSubmit,
}: CreateEditContentModalProps) {
  const categories = propCats || availableCategories || []
  const rawTags = propTags || availableTags || []
  const tags: ContentTag[] = rawTags.map((t, idx) =>
    typeof t === 'string'
      ? { id: `tag-${idx}`, name: t, created_at: new Date().toISOString() }
      : t
  )
  const isEditing = Boolean(item)
  const [activeTab, setActiveTab] = useState<'EDIT' | 'SPLIT' | 'PREVIEW'>('EDIT')
  const [studioSubTab, setStudioSubTab] = useState<'STRATEGY' | 'CREATIVE' | 'PUBLISHING'>('STRATEGY')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Core Form State
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [contentType, setContentType] = useState('')
  const [category, setCategory] = useState('')
  const [department, setDepartment] = useState('Digital Marketing')
  const [product, setProduct] = useState('Client Retainer Deliverable')
  const [projectId, setProjectId] = useState('NONE')
  const [ownerId, setOwnerId] = useState(currentUserId || '')
  const [assignedToId, setAssignedToId] = useState('UNASSIGNED')
  const [assignedRole, setAssignedRole] = useState<AssignedRole>('Content Strategist')
  const [priority, setPriority] = useState<ContentPriority>('High')
  const [tagsInput, setTagsInput] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [nextReviewDate, setNextReviewDate] = useState('')

  // Marketing Agency Specific State
  const [clientName, setClientName] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['Instagram', 'Meta Ads'])
  const [primaryPlatform, setPrimaryPlatform] = useState('Instagram')
  const [targetAudience, setTargetAudience] = useState('')
  const [contentObjective, setContentObjective] = useState(MARKETING_OBJECTIVES[0])
  const [toneOfVoice, setToneOfVoice] = useState(TONES_OF_VOICE[0])
  const [callToAction, setCallToAction] = useState('Shop Now with 20% OFF')
  const [primaryKeywordsInput, setPrimaryKeywordsInput] = useState('')
  const [hashtagsInput, setHashtagsInput] = useState('')
  const [creativeFormat, setCreativeFormat] = useState(CREATIVE_FORMATS[0])
  const [creativeBrief, setCreativeBrief] = useState('')
  const [scheduledPublishTime, setScheduledPublishTime] = useState('')

  // Active content types merged with agency presets
  const selectableTypes = useMemo(() => {
    const existing = contentTypes.filter(
      (t) => t.is_active || (item && item.content_type === t.name)
    )
    const existingNames = new Set(existing.map((t) => t.name.toLowerCase()))
    const specAdditions = SPEC_CONTENT_TYPES.filter(
      (name) => !existingNames.has(name.toLowerCase())
    ).map((name) => ({
      id: `spec-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      description: `${name} marketing deliverable format`,
      is_active: true,
      created_at: new Date().toISOString(),
    }))
    return [...specAdditions, ...existing]
  }, [contentTypes, item])

  // File Attachments State & Dropzone Handlers
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: number; type: string }[]>(
    () => (item?.attachments || []).map((a) => ({ id: a.id, name: a.file_name, size: a.file_size, type: a.mime_type }))
  )
  const [isDragging, setIsDragging] = useState(false)

  const handleFileDrop = (files: FileList) => {
    const newFiles: { id: string; name: string; size: number; type: string }[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      newFiles.push({
        id: 'att-' + Date.now().toString(36) + '-' + i,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
      })
    }
    setAttachments((prev) => [...prev, ...newFiles])
  }

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  // Populate form on open/edit
  useEffect(() => {
    if (item) {
      setTitle(item.title || '')
      setSummary(item.summary || '')
      setBody(item.body || '')
      setContentType(item.content_type || selectableTypes[0]?.name || '')
      setCategory(item.category || categories[0]?.name || 'Social Media & Community')
      setDepartment(item.department || 'Digital Marketing')
      setProduct(item.product || 'Client Retainer Deliverable')
      setProjectId(item.project_id || 'NONE')
      setOwnerId(item.owner_id || currentUserId || '')
      setAssignedToId(item.assigned_to_id || 'UNASSIGNED')
      setAssignedRole(item.assigned_role || 'Content Strategist')
      setPriority(item.priority || 'High')
      setTagsInput(item.tags ? item.tags.join(', ') : '')
      setDueDate(item.due_date ? item.due_date.slice(0, 10) : '')
      setChangeSummary('')
      setNextReviewDate(item.next_review_date ? item.next_review_date.slice(0, 10) : '')

      // Marketing specific
      setClientName(item.client_name || 'Apex Retail Global')
      setCampaignName(item.campaign_name || 'Q4 Conversion Blitz')
      setTargetPlatforms(item.target_platforms && item.target_platforms.length > 0 ? item.target_platforms : ['Instagram', 'Meta Ads'])
      setPrimaryPlatform(item.primary_platform || 'Instagram')
      setTargetAudience(item.target_audience || '')
      setContentObjective(item.content_objective || MARKETING_OBJECTIVES[0])
      setToneOfVoice(item.tone_of_voice || TONES_OF_VOICE[0])
      setCallToAction(item.call_to_action || 'Shop Now with 20% OFF')
      setPrimaryKeywordsInput(item.primary_keywords ? item.primary_keywords.join(', ') : '')
      setHashtagsInput(item.hashtags ? item.hashtags.join(' ') : '')
      setCreativeFormat(item.creative_format || CREATIVE_FORMATS[0])
      setCreativeBrief(item.creative_brief || '')
      setScheduledPublishTime(item.scheduled_publish_time || '')
      setAttachments((item.attachments || []).map((a) => ({ id: a.id, name: a.file_name, size: a.file_size, type: a.mime_type })))
    } else {
      // Agency Defaults for new content asset
      setTitle('')
      setSummary('')
      setBody('')
      const defaultType = selectableTypes[0]?.name || AGENCY_CONTENT_TYPES[0]
      setContentType(defaultType)
      setCategory(categories[0]?.name || 'Social Media & Community')
      setDepartment('Digital Marketing')
      setProduct('Client Retainer Deliverable')
      setProjectId('NONE')
      setOwnerId(currentUserId || '')
      setAssignedToId('UNASSIGNED')
      setAssignedRole('Content Strategist')
      setPriority('High')
      setTagsInput('')
      setDueDate('')
      setChangeSummary('')
      setNextReviewDate('')

      // Marketing defaults
      setClientName('Apex Retail Global')
      setCampaignName('Q4 Conversion Blitz 2026')
      setTargetPlatforms(['Instagram', 'Meta Ads'])
      setPrimaryPlatform('Instagram')
      setTargetAudience('Tech-savvy consumers & digital shoppers aged 22-45 interested in premium products')
      setContentObjective(MARKETING_OBJECTIVES[0])
      setToneOfVoice(TONES_OF_VOICE[0])
      setCallToAction('Shop Now with 20% OFF')
      setPrimaryKeywordsInput('flash sale, seasonal discount, premium lifestyle')
      setHashtagsInput('#DigitalMarketing #FlashSale #ExclusiveOffer #Growth')
      setCreativeFormat(CREATIVE_FORMATS[0])
      setCreativeBrief('Bold high-contrast background with product spotlight. Emphasize 20% OFF countdown timer.')
      setScheduledPublishTime('')
      setAttachments([])
    }
    setActiveTab('EDIT')
    setStudioSubTab('STRATEGY')
    setError('')
  }, [item, isOpen, currentUserId, categories, selectableTypes])

  // Helper parse tags & keywords
  const parseTags = () => {
    return Array.from(
      new Set(
        tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      )
    )
  }

  const parseKeywords = () => {
    return Array.from(
      new Set(
        primaryKeywordsInput
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
      )
    )
  }

  const parseHashtags = () => {
    return Array.from(
      new Set(
        hashtagsInput
          .split(/[\s,]+/)
          .map((h) => h.trim())
          .filter((h) => h.length > 0)
          .map((h) => (h.startsWith('#') ? h : `#${h}`))
      )
    )
  }

  // Toggle platform in targetPlatforms
  const handleTogglePlatform = (platformName: string) => {
    let updated: string[]
    if (targetPlatforms.includes(platformName)) {
      if (targetPlatforms.length === 1) return // Keep at least one
      updated = targetPlatforms.filter((p) => p !== platformName)
    } else {
      updated = [...targetPlatforms, platformName]
    }
    setTargetPlatforms(updated)
    if (!updated.includes(primaryPlatform)) {
      setPrimaryPlatform(updated[0])
    }
  }

  // Quick insertion helpers for copywriters
  const handleInsertHook = (hookText: string) => {
    setBody((prev) => (prev ? `${hookText}\n\n${prev}` : `${hookText}\n\n`))
  }

  const handleAppendCTA = () => {
    const ctaString = `\n\n👉 ${callToAction}\n${parseHashtags().join(' ')}`
    setBody((prev) => `${prev.trim()}${ctaString}`)
  }

  const handleInsertBulletPoints = () => {
    const bullets = `\n• Key Benefit #1: \n• Key Benefit #2: \n• Key Benefit #3: \n`
    setBody((prev) => `${prev}${bullets}`)
  }

  const handleToggleHashtag = (tag: string) => {
    const current = parseHashtags()
    let updated: string[]
    if (current.includes(tag)) {
      updated = current.filter((t) => t !== tag)
    } else {
      updated = [...current, tag]
    }
    setHashtagsInput(updated.join(' '))
  }

  // Copy Statistics & Platform Character Limits
  const charCount = body.length
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  // Platform limits:
  const TWITTER_LIMIT = 280
  const META_AD_RECOMMENDED = 125
  const INSTAGRAM_LIMIT = 2200
  const LINKEDIN_LIMIT = 3000

  const handleFormSubmit = async (status: 'Draft' | 'In Review') => {
    if (!title.trim()) {
      setError('Campaign Asset Title / Headline is required.')
      return
    }
    if (!contentType.trim()) {
      setError('Content Deliverable Type is required.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const selectedProject = projects.find((p) => p.id === projectId)
      const selectedOwner = employees.find((e) => e.id === ownerId)
      const selectedAssignee = employees.find((e) => e.id === assignedToId)

      const payload: CreateContentInput | UpdateContentInput = {
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim(),
        content_type: contentType,
        category: category || 'Social Media & Community',
        department: department.trim() || 'Digital Marketing',
        product: product.trim() || 'Client Retainer Deliverable',
        project_id: projectId === 'NONE' ? null : projectId,
        project_name: selectedProject ? selectedProject.name : 'Client Retainer Deliverables',
        owner_id: ownerId || currentUserId,
        owner_name: selectedOwner ? selectedOwner.name : (currentUserName || 'Campaign Strategist'),
        status,
        tags: parseTags(),
        due_date: dueDate || null,
        assigned_to_id: assignedToId === 'UNASSIGNED' ? null : assignedToId,
        assigned_to_name: selectedAssignee ? selectedAssignee.name : null,
        assigned_role: assignedRole,
        priority,
        change_summary: changeSummary.trim() || (isEditing ? 'Updated campaign copy and creative specifications' : 'Initial campaign asset draft'),
        next_review_date: nextReviewDate || null,

        // Marketing Agency Specific Properties
        client_name: clientName.trim() || 'Apex Retail Global',
        campaign_name: campaignName.trim() || 'Q4 Marketing Blitz',
        target_platforms: targetPlatforms,
        primary_platform: primaryPlatform,
        target_audience: targetAudience.trim() || null,
        content_objective: contentObjective,
        tone_of_voice: toneOfVoice,
        call_to_action: callToAction.trim() || null,
        primary_keywords: parseKeywords(),
        hashtags: parseHashtags(),
        creative_format: creativeFormat,
        creative_brief: creativeBrief.trim() || null,
        scheduled_publish_time: scheduledPublishTime || null,

        attachments: attachments.map((a) => ({
          id: a.id,
          file_name: a.name,
          file_size: a.size,
          mime_type: a.type,
          file_url: `/uploads/${a.name}`,
          uploaded_by_id: ownerId || currentUserId || 'system',
          uploaded_by_name: selectedOwner?.name || currentUserName || 'Strategist',
          created_at: new Date().toISOString(),
        })),
      }

      await onSubmit(payload, status)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save marketing campaign content.')
    } finally {
      setLoading(false)
    }
  }

  // Interactive Live Social & Ad Mockup Card
  const renderSocialAdMockup = () => {
    const hashtagsList = parseHashtags()
    const displayClient = clientName.trim() || 'Brand Partner'
    const displayHandle = displayClient.toLowerCase().replace(/[^a-z0-9]/g, '')

    return (
      <div className="space-y-4 max-w-xl mx-auto">
        {/* Mockup Selector Bar */}
        <div className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="font-semibold">Live Preview Channel:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {['Instagram', 'LinkedIn', 'Meta Ads', 'X (Twitter)', 'Blog'].map((plat) => (
              <button
                key={plat}
                type="button"
                onClick={() => setPrimaryPlatform(plat)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                  primaryPlatform === plat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {plat}
              </button>
            ))}
          </div>
        </div>

        {/* 1. INSTAGRAM FEED POST MOCKUP */}
        {primaryPlatform === 'Instagram' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-3.5 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5">
                  <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center font-bold text-xs text-white">
                    {displayClient.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-100">{displayHandle}</span>
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[9px] px-1 py-0">
                      Sponsored
                    </Badge>
                  </div>
                  <p className="text-[10px] text-zinc-400">{campaignName || 'Campaign Partner'}</p>
                </div>
              </div>
              <span className="text-zinc-400 text-xs font-bold tracking-widest">•••</span>
            </div>

            {/* Visual Media Placeholder or Attached File Preview */}
            <div className="relative aspect-square w-full bg-gradient-to-br from-zinc-900 via-indigo-950/40 to-zinc-900 flex flex-col items-center justify-center p-6 text-center border-y border-zinc-800/50">
              <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-3 shadow-inner">
                <Palette className="w-8 h-8 text-indigo-400" />
              </div>
              <Badge className="bg-zinc-800/80 text-zinc-200 border-zinc-700 text-[10px] mb-2 font-mono">
                {creativeFormat}
              </Badge>
              <h4 className="text-lg font-bold text-white max-w-sm line-clamp-2">
                {title || 'High-Impact Campaign Hook Headline'}
              </h4>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs line-clamp-2 italic">
                {creativeBrief || 'Visual creative asset placeholder according to designer brief.'}
              </p>
            </div>

            {/* Instagram Action Strip */}
            <div className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-zinc-300">
                <div className="flex items-center gap-4">
                  <ThumbsUp className="w-5 h-5 hover:text-rose-500 cursor-pointer" />
                  <MessageSquare className="w-5 h-5 hover:text-indigo-400 cursor-pointer" />
                  <Share2 className="w-5 h-5 hover:text-sky-400 cursor-pointer" />
                </div>
                <Bookmark className="w-5 h-5 hover:text-amber-400 cursor-pointer" />
              </div>

              <div className="text-xs font-semibold text-zinc-200">
                1,428 likes • <span className="text-indigo-400 font-normal">Active Reach</span>
              </div>

              {/* Caption */}
              <div className="text-xs text-zinc-300 space-y-1.5 leading-relaxed">
                <p>
                  <strong className="text-zinc-100 mr-1.5">{displayHandle}</strong>
                  {body ? (
                    <span className="whitespace-pre-wrap">{body}</span>
                  ) : (
                    <span className="text-zinc-500 italic">Enter primary caption copy in the editor...</span>
                  )}
                </p>
                {hashtagsList.length > 0 && (
                  <p className="text-indigo-400 font-medium text-[11px] pt-1">
                    {hashtagsList.join(' ')}
                  </p>
                )}
              </div>

              {/* Direct CTA Bar */}
              {callToAction && (
                <div className="pt-2">
                  <div className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-between text-xs font-semibold shadow-md transition-colors">
                    <span>{callToAction}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. LINKEDIN POST MOCKUP */}
        {primaryPlatform === 'LinkedIn' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center font-bold text-sm text-white">
                  {displayClient.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>{displayClient}</span>
                    <span className="text-[10px] text-zinc-400">• 1st</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">18,450 followers • Promoted</p>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Just now • 🌐
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-sky-500/50 text-sky-400 h-7 text-xs">
                + Follow
              </Button>
            </div>

            <div className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {body || 'Write compelling B2B thought leadership or conversion copy for LinkedIn.'}
            </div>

            {hashtagsList.length > 0 && (
              <div className="text-sky-400 text-xs font-semibold">
                {hashtagsList.join(' ')}
              </div>
            )}

            {/* Content banner card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-sky-950/40 via-zinc-900 to-indigo-950/40 border-b border-zinc-800">
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px] mb-1">
                  {campaignName || 'B2B Executive Campaign'}
                </Badge>
                <h5 className="text-sm font-bold text-zinc-100 line-clamp-1">{title || 'Campaign Deliverable'}</h5>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{summary || creativeBrief}</p>
              </div>
              <div className="p-2.5 flex items-center justify-between bg-zinc-900 text-xs">
                <span className="text-zinc-400 truncate">{displayHandle}.agency/case-study</span>
                <span className="font-semibold text-sky-400">{callToAction}</span>
              </div>
            </div>

            {/* Reaction bar */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-around text-xs text-zinc-400">
              <button className="flex items-center gap-1.5 hover:text-sky-400 py-1">
                <ThumbsUp className="w-4 h-4" /> <span>Like</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-sky-400 py-1">
                <MessageSquare className="w-4 h-4" /> <span>Comment</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-sky-400 py-1">
                <Share2 className="w-4 h-4" /> <span>Repost</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-sky-400 py-1">
                <Send className="w-4 h-4" /> <span>Send</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. META ADS (FACEBOOK FEED AD) MOCKUP */}
        {primaryPlatform === 'Meta Ads' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
                  {displayClient.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100">{displayClient}</h4>
                  <p className="text-[10px] text-zinc-400">Sponsored • 🌐</p>
                </div>
              </div>
              <span className="text-zinc-400 text-xs">•••</span>
            </div>

            {/* Primary Text */}
            <div className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {body || 'Meta Ad primary copy. Recommend keeping under 125 characters before the "See More" cut.'}
            </div>

            {/* Creative Banner */}
            <div className="relative aspect-video w-full rounded-xl bg-gradient-to-br from-blue-950/40 via-zinc-900 to-indigo-950/40 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] mb-2 font-mono">
                {creativeFormat}
              </Badge>
              <h4 className="text-base font-bold text-white max-w-sm">{title || 'Convert High-Intent Buyers'}</h4>
              <p className="text-xs text-zinc-400 mt-1">{campaignName}</p>
            </div>

            {/* Link & CTA Strip */}
            <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <p className="text-[10px] text-zinc-400 uppercase font-mono">{displayHandle}.com</p>
                <h5 className="text-xs font-bold text-zinc-100 truncate">{title || 'Special Promotion'}</h5>
                <p className="text-[11px] text-zinc-400 truncate">{summary || 'Exclusive limited-time agency offer.'}</p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shrink-0">
                {callToAction || 'Learn More'}
              </Button>
            </div>
          </div>
        )}

        {/* 4. X / TWITTER TWEET MOCKUP */}
        {primaryPlatform === 'X (Twitter)' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-sm text-zinc-100">
                {displayClient.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-zinc-100">{displayClient}</span>
                  <span className="text-[10px] text-sky-400">☑</span>
                  <span className="text-xs text-zinc-500">@{displayHandle}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-xs text-zinc-500">12m</span>
                </div>

                <div className="text-xs text-zinc-200 mt-2 whitespace-pre-wrap leading-relaxed">
                  {body || 'Write sharp, viral, concise hook tweets. Max 280 characters.'}
                </div>

                {hashtagsList.length > 0 && (
                  <div className="text-sky-400 text-xs mt-2">
                    {hashtagsList.join(' ')}
                  </div>
                )}

                {/* Character warning */}
                {charCount > TWITTER_LIMIT && (
                  <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy exceeds Twitter limit by {charCount - TWITTER_LIMIT} characters!</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-zinc-500 text-xs mt-4 pt-3 border-t border-zinc-800/80 max-w-sm">
                  <span className="flex items-center gap-1 hover:text-sky-400 cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" /> 42
                  </span>
                  <span className="flex items-center gap-1 hover:text-emerald-400 cursor-pointer">
                    <Share2 className="w-3.5 h-3.5" /> 183
                  </span>
                  <span className="flex items-center gap-1 hover:text-rose-400 cursor-pointer">
                    <ThumbsUp className="w-3.5 h-3.5" /> 894
                  </span>
                  <span className="flex items-center gap-1 hover:text-sky-400 cursor-pointer">
                    <BarChart3 className="w-3.5 h-3.5" /> 24.5K
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. SEO BLOG / ARTICLE MOCKUP */}
        {primaryPlatform === 'Blog' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="space-y-2 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  {clientName || 'Agency Client Blog'}
                </Badge>
                <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
                  {campaignName}
                </Badge>
                <span className="text-xs text-zinc-500 font-mono">
                  {wordCount} words • {readingTime} min read
                </span>
              </div>
              <h2 className="text-xl font-bold text-zinc-100">{title || 'SEO Pillar Content Headline'}</h2>
              {summary && (
                <p className="text-xs text-zinc-300 italic bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
                  {summary}
                </p>
              )}
            </div>

            <div className="prose prose-invert max-w-none text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {body || 'Write full long-form SEO articles with headers, citations, and product recommendations.'}
            </div>

            {callToAction && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">Next Action Step</h4>
                  <p className="text-[11px] text-zinc-400">Ready to implement these insights?</p>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs">
                  {callToAction}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl lg:max-w-7xl xl:max-w-[1440px] w-[96vw] max-h-[94vh] h-[94vh] p-0 bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 px-6 border-b border-zinc-800/80 bg-zinc-900/70 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>{isEditing ? `Edit Campaign Deliverable: ${item?.title}` : 'Digital Marketing Agency Content Studio'}</span>
                {isEditing && (
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[11px] font-mono">
                    v{item?.version || 1}.0
                  </Badge>
                )}
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] hidden sm:inline-flex">
                  Marketing Agency Mode
                </Badge>
              </DialogTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Design multi-channel campaigns, craft high-converting ad copy, viral social posts, SEO blogs, and client deliverables.
              </p>
            </div>
          </div>

          {/* Editor Mode Tabs */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 mr-6">
            <button
              type="button"
              onClick={() => setActiveTab('EDIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'EDIT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Studio Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SPLIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'SPLIT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split Mockup</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'PREVIEW'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Social & Ad Preview</span>
            </button>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 mx-6 mt-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'EDIT' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Campaign Strategy, Channels & Creative Direction (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Studio Sub-Tab Pill Bar */}
                <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setStudioSubTab('STRATEGY')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      studioSubTab === 'STRATEGY'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Client & Strategy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioSubTab('CREATIVE')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      studioSubTab === 'CREATIVE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Creative & Media</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioSubTab('PUBLISHING')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      studioSubTab === 'PUBLISHING'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Publish & Team</span>
                  </button>
                </div>

                {/* SUBTAB 1: CLIENT & STRATEGY */}
                {studioSubTab === 'STRATEGY' && (
                  <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-4">
                    {/* Client & Campaign */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Client / Brand Name <span className="text-indigo-400">*</span>
                      </label>
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Apex Retail Global, Nimbus Cloud"
                        className="bg-zinc-900 border-zinc-800 text-sm focus:border-indigo-500 mb-1.5"
                      />
                      {/* Quick Client Pills */}
                      <div className="flex flex-wrap gap-1">
                        {PRESET_CLIENTS.slice(0, 4).map((client) => (
                          <button
                            key={client}
                            type="button"
                            onClick={() => setClientName(client)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                              clientName === client
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {client}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Campaign Name & Project */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Campaign Name
                        </label>
                        <Input
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="e.g. Q4 Holiday Blitz 2026"
                          className="bg-zinc-900 border-zinc-800 text-xs focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Client Project
                        </label>
                        <select
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="NONE">General Marketing Retainer</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Primary Channel & Distribution */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5">
                        Target Channels (Click to Toggle)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {MARKETING_PLATFORMS.map((plat) => {
                          const isSelected = targetPlatforms.includes(plat.name)
                          return (
                            <button
                              key={plat.id}
                              type="button"
                              onClick={() => handleTogglePlatform(plat.name)}
                              className={`text-[11px] p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                                isSelected
                                  ? `${plat.color} font-semibold shadow-xs`
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <span className="truncate flex items-center gap-1">
                                <span>{plat.icon}</span>
                                <span className="truncate">{plat.name}</span>
                              </span>
                              {isSelected && <Check className="w-3 h-3 shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Primary Channel Selector for Mockup */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Primary Mockup Channel
                      </label>
                      <select
                        value={primaryPlatform}
                        onChange={(e) => setPrimaryPlatform(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {targetPlatforms.map((plat) => (
                          <option key={plat} value={plat}>
                            {plat} (Active Channel)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Marketing Objective */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Marketing Funnel Objective
                      </label>
                      <select
                        value={contentObjective}
                        onChange={(e) => setContentObjective(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {MARKETING_OBJECTIVES.map((obj) => (
                          <option key={obj} value={obj}>
                            {obj}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Audience / ICP Persona */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Target Audience / Buyer Persona (ICP)
                      </label>
                      <textarea
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="e.g. B2B Founders, Marketing Directors, Tech early-adopters, 25-45 age bracket..."
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Tone of Voice */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Tone of Voice
                      </label>
                      <select
                        value={toneOfVoice}
                        onChange={(e) => setToneOfVoice(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {TONES_OF_VOICE.map((tone) => (
                          <option key={tone} value={tone}>
                            {tone}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: CREATIVE & MEDIA */}
                {studioSubTab === 'CREATIVE' && (
                  <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-4">
                    {/* Creative Asset Format */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Creative Asset Format <span className="text-indigo-400">*</span>
                      </label>
                      <select
                        value={creativeFormat}
                        onChange={(e) => setCreativeFormat(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {CREATIVE_FORMATS.map((fmt) => (
                          <option key={fmt} value={fmt}>
                            {fmt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Designer Brief / Visual Directions */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Creative Brief & Designer Directions
                      </label>
                      <textarea
                        value={creativeBrief}
                        onChange={(e) => setCreativeBrief(e.target.value)}
                        placeholder="Directions for video editor or graphic designer: visual hooks, brand hex colors, sound tracks, motion graphics..."
                        rows={4}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Call to Action (CTA) */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Call to Action (CTA)
                      </label>
                      <Input
                        value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)}
                        placeholder="e.g. Shop Now with 20% OFF"
                        className="bg-zinc-900 border-zinc-800 text-xs focus:border-indigo-500 mb-1.5"
                      />
                      {/* Quick CTAs */}
                      <div className="flex flex-wrap gap-1">
                        {QUICK_CTAS.map((cta) => (
                          <button
                            key={cta}
                            type="button"
                            onClick={() => setCallToAction(cta)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                              callToAction === cta
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {cta}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* File Attachments Dropzone */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Design Mockups & Brand Assets ({attachments.length})</span>
                        </span>
                        <span className="text-[10px] text-zinc-500">PNG, MP4, PDF, PSD</span>
                      </label>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDragging(true)
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setIsDragging(false)
                          if (e.dataTransfer.files) handleFileDrop(e.dataTransfer.files)
                        }}
                        className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                          isDragging
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                        }`}
                      >
                        <input
                          type="file"
                          multiple
                          id="agency-file-upload"
                          className="hidden"
                          onChange={(e) => e.target.files && handleFileDrop(e.target.files)}
                        />
                        <label htmlFor="agency-file-upload" className="cursor-pointer flex flex-col items-center">
                          <UploadCloud className="w-5 h-5 text-indigo-400 mb-1" />
                          <span className="text-xs font-medium text-zinc-200">
                            Upload graphic assets, video drafts or briefs
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">
                            Files will be linked to this campaign deliverable
                          </span>
                        </label>
                      </div>

                      {attachments.length > 0 && (
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {attachments.map((file, idx) => (
                            <div
                              key={file.id || idx}
                              className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <Paperclip className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="text-zinc-200 truncate">{file.name}</span>
                                <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                                  ({(file.size / 1024).toFixed(0)} KB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(idx)}
                                className="text-zinc-500 hover:text-rose-400 p-1 rounded shrink-0 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: PUBLISHING & TEAM */}
                {studioSubTab === 'PUBLISHING' && (
                  <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-4">
                    {/* Strategist & Assignee */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Campaign Strategist / Owner
                        </label>
                        <select
                          value={ownerId}
                          onChange={(e) => setOwnerId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.designation || 'Staff'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Assigned Copywriter / Creator
                        </label>
                        <select
                          value={assignedToId}
                          onChange={(e) => setAssignedToId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="UNASSIGNED">-- Unassigned --</option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} ({e.department || 'Creative'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Deliverable Priority & Role */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Priority / Rush Level
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as ContentPriority)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Low">Low Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="High">High Priority (Standard Campaign)</option>
                          <option value="Urgent">Urgent / Rush Campaign</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Assigned Role
                        </label>
                        <select
                          value={assignedRole}
                          onChange={(e) => setAssignedRole(e.target.value as AssignedRole)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Content Strategist">Content Strategist</option>
                          <option value="Copywriter">Copywriter</option>
                          <option value="Social Media Manager">Social Media Manager</option>
                          <option value="SEO Specialist">SEO Specialist</option>
                          <option value="Video Editor">Video Editor</option>
                          <option value="Graphic Designer">Graphic Designer</option>
                          <option value="Developer">Developer</option>
                        </select>
                      </div>
                    </div>

                    {/* Due Date & Scheduled Publish Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Client Due Date
                        </label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                          Live Publish Schedule
                        </label>
                        <Input
                          type="datetime-local"
                          value={scheduledPublishTime}
                          onChange={(e) => setScheduledPublishTime(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Version Change Log when editing */}
                    {isEditing && (
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-1">
                        <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Version Change Summary</span>
                        </label>
                        <input
                          value={changeSummary}
                          onChange={(e) => setChangeSummary(e.target.value)}
                          placeholder="e.g. Refined ad hook, adjusted CTA for Meta Ads A/B test..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Saving creates version <strong className="text-indigo-400 font-mono">v{(item?.version || 1) + 1}.0</strong> while preserving complete audit history.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: The Copywriting & Headline Studio (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                {/* Headline / Asset Title */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Campaign Asset Title / Post Headline <span className="text-indigo-400">*</span>
                      </label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. 5 Signs Your Brand Is Losing Revenue in 2026"
                        className="bg-zinc-900 border-zinc-800 text-sm font-semibold text-zinc-100 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Deliverable Type <span className="text-indigo-400">*</span>
                      </label>
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        {selectableTypes.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hook / Executive Summary */}
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                      Scroll-Stopping Hook / Executive Synopsis
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="The opening 1-2 sentence hook that stops the scroll and sets up the primary message..."
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Main Copywriting Area with Agency Character Monitors */}
                <div className="flex-1 flex flex-col bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ad Copy & Content Script</span>
                      </span>
                    </div>

                    {/* Live Platform Limits Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      {/* Twitter */}
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          charCount <= TWITTER_LIMIT
                            ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold'
                        }`}
                      >
                        𝕏 {charCount}/{TWITTER_LIMIT}
                      </span>

                      {/* Meta Ad Rec */}
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          charCount <= META_AD_RECOMMENDED
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        Meta {charCount}/{META_AD_RECOMMENDED} rec
                      </span>

                      {/* Instagram */}
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        IG {charCount}/{INSTAGRAM_LIMIT}
                      </span>

                      {/* Words */}
                      <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {wordCount} words • {readingTime}m read
                      </span>
                    </div>
                  </div>

                  {/* Copywriting Quick Helper Tools */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-1">
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 mr-1">
                      <Lightbulb className="w-3 h-3 text-amber-400" /> Quick Insert:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInsertHook('🚨 STOP SCROLLING IF YOU WANT TO SCALE YOUR BRAND IN 2026:')}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                    >
                      + Stop Hook
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertHook('💡 The #1 mistake 90% of founders make before scaling:')}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                    >
                      + Mistake Hook
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertBulletPoints}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                    >
                      + Bullet Points
                    </button>
                    <button
                      type="button"
                      onClick={handleAppendCTA}
                      className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 font-medium"
                    >
                      + Append CTA & Hashtags
                    </button>
                  </div>

                  {/* Textarea */}
                  <div className="flex-1 min-h-[280px] flex flex-col">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write your ad copy, video storyboard script, carousel slides, or social caption here...\n\nExample Hook:\n🚨 Most businesses lose 30% of their ad spend on weak funnels.\n\nHere is our 3-step agency playbook to fix it today:"
                      rows={14}
                      className="w-full flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed shadow-inner"
                    />
                  </div>

                  {/* Keywords & Hashtags Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                        Primary SEO Keywords (comma-separated)
                      </label>
                      <Input
                        value={primaryKeywordsInput}
                        onChange={(e) => setPrimaryKeywordsInput(e.target.value)}
                        placeholder="growth marketing, conversion rate, b2b saas"
                        className="bg-zinc-950 border-zinc-800 text-xs focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                        Hashtags
                      </label>
                      <Input
                        value={hashtagsInput}
                        onChange={(e) => setHashtagsInput(e.target.value)}
                        placeholder="#Marketing #Growth #BrandStrategy"
                        className="bg-zinc-950 border-zinc-800 text-xs focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Quick Select Popular Agency Hashtags */}
                  <div className="pt-1">
                    <span className="text-[10px] text-zinc-500 block mb-1">Quick Agency Hashtags:</span>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_AGENCY_HASHTAGS.map((tag) => {
                        const isSelected = parseHashtags().includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleHashtag(tag)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SPLIT' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Quick Copy Editor */}
              <div className="space-y-4">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                      Campaign Asset Title
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Campaign deliverable headline..."
                      className="bg-zinc-900 border-zinc-800 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Client
                      </label>
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                        Call to Action
                      </label>
                      <Input
                        value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                      Scroll-Stopping Hook
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Hook sentence..."
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-1">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Ad Copy / Storyboard Script
                    </label>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                      <span>{charCount} chars</span>
                      <span>•</span>
                      <span>{wordCount} words</span>
                    </div>
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter copy here..."
                    rows={16}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-100 focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              {/* Right: Real-time Social Mockup */}
              <div className="overflow-y-auto max-h-[72vh] p-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Real-time Live Social & Ad Mockup</span>
                </div>
                {renderSocialAdMockup()}
              </div>
            </div>
          )}

          {activeTab === 'PREVIEW' && (
            <div className="max-w-3xl mx-auto py-2">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-zinc-100">Deliverable Client Presentation Preview</h3>
                <p className="text-xs text-zinc-400">Review exactly how this asset will render on the client's chosen channel.</p>
              </div>
              {renderSocialAdMockup()}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-zinc-800/80 bg-zinc-900/70 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleFormSubmit('Draft')}
              className="border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 px-4"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save Agency Draft
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleFormSubmit('In Review')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 shadow-md shadow-indigo-600/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" />
              )}
              Submit for Client / Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
