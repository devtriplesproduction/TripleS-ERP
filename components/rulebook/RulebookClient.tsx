'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RulebookCategory, CompanyRule } from '@/lib/actions/rulebook'
import { toast } from 'sonner'
import { acknowledgeRule } from '@/lib/actions/rulebook'
import { ShieldAlert, CheckCircle2, History, Plus, BookOpen, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRule } from '@/lib/actions/rulebook'
import { DatePicker } from '@/components/ui/date-picker'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// Mocking some UI elements that would ideally be full dialogs for brevity
// You should expand these into proper shadcn dialogs

interface RulebookClientProps {
  initialRules: CompanyRule[]
  userRole: 'Admin' | 'HR' | 'Employee'
  employeeId: string
  acknowledgedRules: { rule_id: string, version: string }[]
}

const CATEGORIES: RulebookCategory[] = [
  'Work Policy',
  'Security & IT',
  'Leave & PTO',
  'Attendance',
  'Human Resources'
]

export function RulebookClient({ initialRules, userRole, employeeId, acknowledgedRules }: RulebookClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Work Policy')
  const [rules, setRules] = useState<CompanyRule[]>(initialRules)
  const [acks, setAcks] = useState(acknowledgedRules)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newRule, setNewRule] = useState<Partial<CompanyRule>>({ status: 'Draft', category: 'Work Policy' })
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [changeType, setChangeType] = useState<'Minor' | 'Major'>('Minor')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredRules = rules.filter(r => 
    r.category === activeCategory
  )

  const handleAcknowledge = async (ruleId: string, version: string) => {
    try {
      await acknowledgeRule(employeeId, ruleId, version)
      setAcks([...acks, { rule_id: ruleId, version }])
      toast.success("Policy acknowledged successfully.")
    } catch (e) {
      toast.error("Failed to acknowledge policy.")
    }
  }

  const hasAcknowledged = (ruleId: string, version: string) => {
    return acks.some(a => a.rule_id === ruleId && a.version === version)
  }

  const handleDelete = async (ruleId: string) => {
    try {
      const { deleteRule } = await import('@/lib/actions/rulebook');
      await deleteRule(ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
      toast.success("Rule deleted successfully.");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete rule.");
    }
  }

  const handleCreateRule = async () => {
    if (!newRule.title || !newRule.description || !newRule.category) {
      toast.error("Please fill all required fields.")
      return
    }
    setIsSubmitting(true)
    try {
      if (editingRuleId) {
        // Find existing to know if we need a new version
        const existing = rules.find(r => r.id === editingRuleId);
        const isPublished = existing?.status === 'Published';
        // If it's already published, any edit MUST create a new version
        // If it's a Draft, we can just overwrite
        const createNewVersion = isPublished;

        const { updateRule } = await import('@/lib/actions/rulebook');
        const updated = await updateRule(editingRuleId, {
          title: newRule.title,
          category: newRule.category as RulebookCategory,
          description: newRule.description,
          status: newRule.status as any,
          created_by: employeeId,
          effective_date: newRule.effective_date || undefined
        }, createNewVersion, changeType);

        if (createNewVersion) {
          setRules([updated, ...rules]);
        } else {
          setRules(rules.map(r => r.id === editingRuleId ? updated : r));
        }
        toast.success(createNewVersion ? "New version created!" : "Rule updated successfully!");
      } else {
        const created = await createRule({
          title: newRule.title,
          category: newRule.category as RulebookCategory,
          description: newRule.description,
          status: newRule.status as any,
          created_by: employeeId,
          published_at: newRule.status === 'Published' ? new Date().toISOString() : undefined,
          effective_date: newRule.effective_date || undefined
        })
        setRules([created, ...rules])
        toast.success("Rule created successfully!")
      }
      setIsAddOpen(false)
      setNewRule({ status: 'Draft', category: 'Work Policy' })
      setEditingRuleId(null)
      setChangeType('Minor')
    } catch (e: any) {
      toast.error(e.message || "Failed to create rule")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Category Tags */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-border">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
              activeCategory === cat 
                ? "bg-foreground text-background border-foreground" 
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {cat}
          </button>
        ))}
        <div className="flex-1" />
        {(userRole === 'Admin' || userRole === 'HR') && (
          <Button onClick={() => {
            setEditingRuleId(null)
            setNewRule({ status: 'Draft', category: 'Work Policy' })
            setIsAddOpen(true)
          }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        )}
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredRules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-card/50">
            No rules found for this category.
          </div>
        ) : (
          filteredRules.map(rule => {
            const isAcked = hasAcknowledged(rule.id, rule.version)
            const needsAck = rule.status === 'Published'

            return (
              <Card key={rule.id} className="bg-card/40 backdrop-blur-md border-border overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{rule.category}</Badge>
                        <Badge variant={rule.status === 'Published' ? 'default' : 'secondary'}>
                          {rule.status}
                        </Badge>
                        <Badge variant="outline" className="font-mono">
                          v{String(rule.version)?.endsWith('.0') ? String(rule.version).split('.')[0] : String(rule.version)}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{rule.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2 text-xs">
                        Effective: {rule.effective_date ? new Date(rule.effective_date).toLocaleDateString() : 'TBD'}
                        {rule.published_at && ` • Published: ${new Date(rule.published_at).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    
                    {(userRole === 'Admin' || userRole === 'HR') && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <History className="h-4 w-4 mr-2" />
                          History
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingRuleId(rule.id)
                          setNewRule(rule)
                          setIsAddOpen(true)
                        }}>Edit</Button>
                        <ConfirmModal
                          title="Delete Rule"
                          description="Are you sure you want to delete this rule? This action cannot be undone."
                          confirmText="Delete"
                          onConfirm={() => handleDelete(rule.id)}
                        >
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmModal>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                    {rule.description}
                  </div>
                </CardContent>
                {needsAck && (
                  <CardFooter className="bg-muted/30 pt-4 border-t border-border flex justify-between items-center">
                    <div className="text-sm">
                      {isAcked ? (
                        <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Acknowledged
                        </span>
                      ) : (
                        <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium">
                          <ShieldAlert className="h-4 w-4 mr-2" />
                          Acknowledgement Required
                        </span>
                      )}
                    </div>
                    {!isAcked && (
                      <Button onClick={() => handleAcknowledge(rule.id, String(rule.version))} variant="default">
                        Acknowledge v{String(rule.version)?.endsWith('.0') ? String(rule.version).split('.')[0] : String(rule.version)}
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={(val) => {
        setIsAddOpen(val)
        if (!val) {
          setEditingRuleId(null)
          setNewRule({ status: 'Draft', category: 'Work Policy' })
          setChangeType('Minor')
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-blue-500" />
              {editingRuleId ? 'Edit Rule' : 'Add New Rule'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Title</Label>
              <Input
                className="col-span-3"
                value={newRule.title || ''}
                onChange={e => setNewRule({ ...newRule, title: e.target.value })}
                placeholder="e.g. Remote Work Policy"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Category</Label>
              <div className="col-span-3">
                <Select
                  value={newRule.category}
                  onValueChange={(val) => setNewRule({ ...newRule, category: val as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <div className="col-span-3">
                <Select
                  value={newRule.status}
                  onValueChange={(val) => setNewRule({ ...newRule, status: val as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Change Type</Label>
              <div className="col-span-3">
                <Select
                  value={changeType}
                  onValueChange={(val) => setChangeType(val as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Change Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Minor">Minor</SelectItem>
                    <SelectItem value="Major">Major</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1.5 ml-1">
                  Preview: {editingRuleId
                    ? (changeType === 'Major' 
                        ? `v${String(newRule.version)?.endsWith('.0') ? String(newRule.version).split('.')[0] : String(newRule.version)} → v${newRule.version ? `${Number(String(newRule.version).split('.')[0]) + 1}` : 'x'}`
                        : `v${String(newRule.version)?.endsWith('.0') ? String(newRule.version).split('.')[0] : String(newRule.version)} → v${newRule.version ? `${String(newRule.version).split('.')[0]}.${Number(String(newRule.version).split('.')[1] || 0) + 1}` : 'x'}`)
                    : `Starts at v1`}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Effective Date</Label>
              <div className="col-span-3">
                <DatePicker
                  value={newRule.effective_date || ''}
                  onChange={val => setNewRule({ ...newRule, effective_date: val })}
                  placeholder="Select Date"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-3">Description</Label>
              <textarea
                className="col-span-3 flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={newRule.description || ''}
                onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Rule details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={handleCreateRule}>
              {isSubmitting ? "Saving..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
