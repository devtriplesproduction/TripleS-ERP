'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Eye, Download, MoreHorizontal, Edit2, MapPin,
  Mail, Phone, CalendarIcon, Briefcase,
  CalendarDays, FileText, User, Users,
  Key, Image as ImageIcon, Send, CheckCircle2, Plus, ArrowLeft
} from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { updateEmployeeData } from '@/lib/actions/onboarding'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface EmployeeDetailsModalProps {
  employee: Employee
  trigger?: React.ReactNode
}

export function EmployeeDetailsModal({ employee, trigger }: EmployeeDetailsModalProps) {
  const [open, setOpen] = useState(false)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [isSavingPersonal, setIsSavingPersonal] = useState(false)
  const { toast } = useToast()

  const [personalForm, setPersonalForm] = useState({
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    dob: employee.dob || '',
    gender: employee.gender || '',
    phone: employee.phone || '',
    personal_email: employee.personal_email || '',
    address: employee.address || ''
  })

  const handleSavePersonal = async () => {
    setIsSavingPersonal(true)
    try {
      await updateEmployeeData(employee.id, personalForm)
      setIsEditingPersonal(false)
      toast({ title: 'Success', description: 'Personal information updated!' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setIsSavingPersonal(false)
    }
  }

  const [isEditingProfessional, setIsEditingProfessional] = useState(false)
  const [isSavingProfessional, setIsSavingProfessional] = useState(false)
  const [professionalForm, setProfessionalForm] = useState({
    employee_id_number: employee.employee_id_number || '',
    department: employee.department || '',
    job_title: employee.job_title || '',
    employment_type: employee.employment_type || '',
    joining_date: employee.joining_date || '',
    reporting_manager: employee.reporting_manager || '',
    email: employee.email || '',
    salary: employee.salary ? employee.salary.toString() : ''
  })

  const handleSaveProfessional = async () => {
    setIsSavingProfessional(true)
    try {
      const dataToSave = {
        ...professionalForm,
        salary: professionalForm.salary ? parseFloat(professionalForm.salary) : null
      }
      await updateEmployeeData(employee.id, dataToSave)
      setIsEditingProfessional(false)
      toast({ title: 'Success', description: 'Professional information updated!' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setIsSavingProfessional(false)
    }
  }

  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [notesForm, setNotesForm] = useState(employee.notes || '')

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      await updateEmployeeData(employee.id, { notes: notesForm })
      setIsEditingNotes(false)
      toast({ title: 'Success', description: 'Notes updated!' })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setIsSavingNotes(false)
    }
  }
  const joinedDate = new Date(employee.joining_date)
  const formattedJoined = joinedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const supabase = createClient()
  const photoUrl = employee.profile_photo
    ? supabase.storage.from('employee-documents').getPublicUrl(employee.profile_photo).data.publicUrl
    : null

  // Mock data for display based on the UI
  const profileCompletion = 100

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={React.isValidElement(trigger) ? (trigger as any) : <span />}>
          {React.isValidElement(trigger) ? undefined : trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 bg-input hover:bg-muted text-muted-foreground hover:text-foreground rounded-md border border-border" />}>
          <Eye className="h-4 w-4" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1200px] w-full max-h-[98vh] overflow-hidden p-0 border-border bg-background text-foreground flex flex-col">
        {/* Header Section */}
        <div className="px-5 py-3 border-b border-border bg-background flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setOpen(false)} className="bg-input/60 border-border/80 hover:bg-input hover:text-foreground text-muted-foreground h-9 px-4 text-sm font-medium shadow-sm transition-all rounded-lg">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>

          {/* Profile Hero */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={`${employee.first_name} ${employee.last_name}`} className="w-full h-full object-cover object-top scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground bg-input">
                    {employee.first_name[0]}{employee.last_name[0]}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">{employee.first_name} {employee.last_name}</h2>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                    Active
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {employee.job_title} <span className="mx-2">|</span> {employee.department}
                </div>
                <div className="flex flex-wrap items-center gap-8 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {employee.email}</div>
                  {employee.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {employee.phone}</div>}
                  {employee.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {employee.address.split(',').pop()?.replace(/Dist:?-?/gi, '')?.trim()}</div>}
                  <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Joined {formattedJoined}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4 rounded-lg bg-secondary border border-border min-w-[240px]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-input flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Employee ID</div>
                  <div className="text-sm font-medium">{employee.employee_id_number || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-input flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Reporting Manager</div>
                  <div className="text-sm font-medium">{employee.reporting_manager || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-background custom-scrollbar min-h-0">
          <Tabs defaultValue="overview" className="w-full">
            <div className="px-5 border-b border-border sticky top-0 bg-background z-10">
              <TabsList className="bg-transparent h-9 p-0 border-none space-x-6 justify-start w-full overflow-x-auto overflow-y-hidden">
                {['Overview', 'Personal Info', 'Professional Info', 'Documents', 'Attendance', 'Leave & Time Off', 'Payroll', 'Onboarding', 'Performance', 'Activity'].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab.toLowerCase().replace(/ /g, '-').replace('&', 'and')}
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground rounded-none h-10 px-0 font-medium text-sm"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-4 m-0 space-y-3">
              {/* 4 Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Employment Status</div>
                    <div className="text-lg font-bold text-foreground">Active</div>
                    <div className="text-[10px] text-muted-foreground">Since {formattedJoined}</div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-secondary/50 text-secondary-foreground flex items-center justify-center shrink-0">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Experience</div>
                    <div className="text-lg font-bold text-foreground">{employee.experience || 0} Years</div>
                    <div className="text-[10px] text-muted-foreground">0 Months</div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-400/80 mb-0.5">Leave Balance</div>
                    <div className="text-lg font-bold text-emerald-100">12 Days</div>
                    <div className="text-[10px] text-emerald-400/60">of 18 days</div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-amber-400/80 mb-0.5">Onboarding Status</div>
                    <div className="text-lg font-bold text-amber-100">{employee.status}</div>
                    <div className="text-[10px] text-amber-400/60">on {formattedJoined}</div>
                  </div>
                </div>
              </div>

              {/* 3 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Left Area Wrapper */}
                <div className="lg:col-span-9">
                  <div className="grid grid-cols-1 lg:grid-cols-9 gap-4">
                    {/* Col 1 */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-bold">Personal Information</h3>
                      </div>
                      {isEditingPersonal ? (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditingPersonal(false)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={handleSavePersonal} disabled={isSavingPersonal}>
                            {isSavingPersonal ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Save
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent border-border hover:bg-input" onClick={() => setIsEditingPersonal(true)}>
                          <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'First Name', field: 'first_name' as const },
                        { label: 'Last Name', field: 'last_name' as const },
                        { label: 'Date of Birth', field: 'dob' as const, type: 'date' },
                        { label: 'Gender', field: 'gender' as const },
                        { label: 'Phone Number', field: 'phone' as const },
                        { label: 'Personal Email', field: 'personal_email' as const },
                        { label: 'Address', field: 'address' as const }
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-border/50 pb-1.5">
                          <span className="text-xs text-muted-foreground w-1/3 shrink-0">{item.label}</span>
                          {isEditingPersonal ? (
                            <Input
                              type={item.type || 'text'}
                              className="h-7 text-xs bg-transparent border-border"
                              value={personalForm[item.field]}
                              onChange={e => setPersonalForm(prev => ({ ...prev, [item.field]: e.target.value }))}
                            />
                          ) : (
                            <span className="text-sm font-medium break-all">
                              {item.field === 'dob' && personalForm.dob ? new Date(personalForm.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) :
                               item.field === 'gender' && personalForm.gender ? String(personalForm.gender).charAt(0).toUpperCase() + String(personalForm.gender).slice(1) : 
                               (personalForm[item.field] || '-')}
                            </span>
                          )}
                        </div>
                      ))}

                      {(() => {
                        let ec = { name: '-', relationship: '-', phone: '-' };
                        if (employee.emergency_contact) {
                          try {
                            const parsed = JSON.parse(employee.emergency_contact);
                            if (parsed.name || parsed.relationship || parsed.phone) ec = parsed;
                          } catch (e) { }
                        }
                        return (
                          <div className="pt-2 mt-2 border-t border-border border-dashed">
                            <span className="text-xs font-bold text-foreground mb-2 block">Emergency Contact</span>
                            <div className="space-y-1.5">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                                <span className="text-xs text-muted-foreground w-1/3 shrink-0">Name & Relation</span>
                                <span className="text-sm font-medium">{ec.name || '-'} {ec.relationship ? `(${ec.relationship})` : ''}</span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                                <span className="text-xs text-muted-foreground w-1/3 shrink-0">Phone Number</span>
                                <span className="text-sm font-medium">{ec.phone || '-'}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-bold">Professional Information</h3>
                      </div>
                      {isEditingProfessional ? (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditingProfessional(false)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={handleSaveProfessional} disabled={isSavingProfessional}>
                            {isSavingProfessional ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Save
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent border-border hover:bg-input" onClick={() => setIsEditingProfessional(true)}>
                          <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Employee ID', field: 'employee_id_number' as const },
                        { label: 'Department', field: 'department' as const },
                        { label: 'Job Title', field: 'job_title' as const },
                        { label: 'Employment Type', field: 'employment_type' as const },
                        { label: 'Date of Joining', field: 'joining_date' as const, type: 'date' },
                        { label: 'Work Location', staticValue: 'Satara (Office)' },
                        { label: 'Reporting Manager', field: 'reporting_manager' as const },
                        { label: 'Work Email', field: 'email' as const },
                        { label: 'Annual CTC (INR)', field: 'salary' as const }
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-xs text-muted-foreground w-[140px] shrink-0">{item.label}</span>
                          {isEditingProfessional && !item.staticValue ? (
                            <Input
                              type={item.type || 'text'}
                              className="h-7 text-xs bg-transparent border-border flex-1"
                              value={professionalForm[item.field as keyof typeof professionalForm]}
                              onChange={e => setProfessionalForm(prev => ({ ...prev, [item.field as keyof typeof professionalForm]: e.target.value }))}
                            />
                          ) : (
                            <span className="text-sm font-medium break-all">
                              {item.staticValue ? item.staticValue :
                                item.field === 'joining_date' && professionalForm.joining_date ? new Date(professionalForm.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) :
                                  item.field === 'salary' && professionalForm.salary ? parseFloat(professionalForm.salary).toLocaleString() :
                                    (professionalForm[item.field as keyof typeof professionalForm] || '-')}
                            </span>
                          )}
                          {!isEditingProfessional && item.field === 'salary' && professionalForm.salary && (
                            <div className="w-full sm:hidden" /> // Force wrap on mobile
                          )}
                        </div>
                      ))}
                      {!isEditingProfessional && professionalForm.salary && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-xs text-muted-foreground w-[140px] shrink-0">Basic Salary (INR)</span>
                          <span className="text-sm font-medium break-all">{(parseFloat(professionalForm.salary) * 0.4).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes Section Spanning Both Columns */}
                <div className="lg:col-span-9">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-bold">Notes</h3>
                      </div>
                      {isEditingNotes ? (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={handleSaveNotes} disabled={isSavingNotes}>
                            {isSavingNotes ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Save
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent border-border hover:bg-input" onClick={() => setIsEditingNotes(true)}>
                          <Edit2 className="w-3 h-3 mr-1.5" /> Edit Notes
                        </Button>
                      )}
                    </div>
                    {isEditingNotes ? (
                      <textarea 
                        value={notesForm}
                        onChange={(e) => setNotesForm(e.target.value)}
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        placeholder="Add internal notes about this employee..."
                      />
                    ) : (
                      <div className="bg-input border border-border rounded-lg p-3 text-sm text-muted-foreground whitespace-pre-wrap min-h-[60px]">
                        {notesForm || 'No internal notes added yet.'}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>                {/* Col 3 */}
                <div className="lg:col-span-3 flex flex-col gap-4">

                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-bold">Profile Completion</h3>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 relative flex items-center justify-center mb-2">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-input" />
                          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray={`${profileCompletion * 2.827} 282.7`} className="text-primary" strokeLinecap="round" />
                        </svg>
                        <div className="absolute font-bold text-xl">{profileCompletion}%</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-sm">Profile Complete</div>
                        <div className="text-xs text-muted-foreground mt-1">All information has been provided.</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-bold text-sm">Important Dates</h3>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Date of Joining</div>
                        <div className="text-xs font-medium">{formattedJoined}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Probation End Date</div>
                        <div className="text-xs font-medium">31 Mar 2027</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Work Anniversary</div>
                        <div className="text-xs font-medium">01 Oct 2027</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-bold text-sm">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Button variant="outline" className="w-full bg-input/50 border-border hover:bg-input h-full flex flex-col gap-2 justify-center">
                        <Key className="w-4 h-4" />
                        <span className="text-xs">Reset Password</span>
                      </Button>
                      <Button variant="outline" className="w-full bg-input/50 border-border hover:bg-input h-full flex flex-col gap-2 justify-center">
                        <Send className="w-4 h-4" />
                        <span className="text-xs">Send Email</span>
                      </Button>
                      <Button variant="outline" className="w-full bg-input/50 border-border hover:bg-input h-full flex flex-col gap-2 justify-center">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-xs">Generate ID Card</span>
                      </Button>
                      <Button variant="outline" className="w-full bg-input/50 border-border hover:bg-input h-full flex flex-col gap-2 justify-center">
                        <Download className="w-4 h-4" />
                        <span className="text-xs">Download Resume</span>
                      </Button>
                    </div>
                  </div>

                </div>
              </div>
            </TabsContent>
            <TabsContent value="personal-info" className="p-4 m-0 space-y-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-muted-foreground" /> Personal Information
                  </h3>
                  <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-input"><Edit2 className="w-4 h-4 mr-2" /> Edit</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
                  {[
                    { label: 'First Name', value: employee.first_name },
                    { label: 'Last Name', value: employee.last_name },
                    { label: 'Date of Birth', value: employee.dob ? new Date(employee.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
                    { label: 'Gender', value: employee.gender ? String(employee.gender).charAt(0).toUpperCase() + String(employee.gender).slice(1) : '-' },
                    { label: 'Phone Number', value: employee.phone || '-' },
                    { label: 'Personal Email', value: employee.personal_email || '-' },
                    { label: 'Emergency Contact', value: (() => {
                        let ecStr = employee.emergency_contact;
                        if (!ecStr) return '-';
                        try {
                          const parsed = JSON.parse(ecStr);
                          return parsed.name ? `${parsed.name} ${parsed.relationship ? `(${parsed.relationship})` : ''} ${parsed.phone ? `- ${parsed.phone}` : ''}` : '-';
                        } catch (e) {
                          return ecStr;
                        }
                    })() },
                    { label: 'Address', value: employee.address || '-' }
                  ].map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</div>
                      <div className="font-medium text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="professional-info" className="p-4 m-0 space-y-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-muted-foreground" /> Professional Information
                  </h3>
                  <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-input"><Edit2 className="w-4 h-4 mr-2" /> Edit</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-6">
                  {[
                    { label: 'Employee ID', value: (employee as any).employee_id_number || '-' },
                    { label: 'Work Email', value: employee.email || '-' },
                    { label: 'Department', value: employee.department || '-' },
                    { label: 'Job Title', value: employee.job_title || '-' },
                    { label: 'Employment Type', value: employee.employment_type || '-' },
                    { label: 'Employment Status', value: employee.status || '-' },
                    { label: 'Date of Joining', value: formattedJoined },
                    { label: 'Annual CTC (INR)', value: employee.salary ? employee.salary.toLocaleString() : '-' },
                    { label: 'Reporting Manager', value: (employee as any).reporting_manager || '-' },
                  ].map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</div>
                      <div className="font-medium text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="p-4 m-0 space-y-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" /> Uploaded Documents
                  </h3>
                  <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-input"><Plus className="w-4 h-4 mr-2" /> Upload</Button>
                </div>
                <div className="text-muted-foreground text-sm text-center py-12 border border-dashed border-border rounded-lg bg-background/50">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-foreground">No documents uploaded yet</p>
                  <p className="mt-1 text-xs">Documents added during onboarding or later will appear here.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
