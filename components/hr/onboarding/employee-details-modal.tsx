'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Eye, Download, MoreHorizontal, Edit2, MapPin,
  Mail, Phone, CalendarIcon, Briefcase,
  CalendarDays, FileText, User, Users,
  Key, Image as ImageIcon, Send, CheckCircle2, Plus, ArrowLeft, Camera,
  Droplet, Heart, Map, Hash, Contact, ShieldAlert,
  Building2, CreditCard, Banknote, CalendarCheck2, Activity,
  ChevronLeft, ChevronRight, Zap, UserX, Code2, Globe, Trash2
} from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { updateEmployeeData, uploadEmployeeFileAction } from '@/lib/actions/onboarding'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/confirm-modal'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEPARTMENTS, DIVISIONS, DESIGNATIONS } from '@/config/roles'

import { SalaryAndHikeTab } from '@/components/hr/payroll/salary-and-hike-tab'
import { HodAssignmentAction } from '@/components/hr/onboarding/hod-assignment-action'
import { HodStatusBadge } from '@/components/hr/onboarding/hod-status-badge'

export function EmployeeDetailsClient({ employee }: { employee: Employee }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null)

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
      router.refresh()
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
    division: employee.division || '',
    designation: employee.designation || employee.job_title || '',
    job_title: employee.job_title || '',
    employment_type: employee.employment_type || '',
    joining_date: employee.joining_date || '',
    email: employee.email || '',
    salary: employee.salary ? employee.salary.toString() : '',
    stipend: employee.stipend ? employee.stipend.toString() : ''
  })

  const handleSaveProfessional = async () => {
    setIsSavingProfessional(true)
    try {
      const dataToSave = {
        ...professionalForm,
        job_title: professionalForm.designation,
        salary: professionalForm.salary ? parseFloat(professionalForm.salary) : null,
        stipend: professionalForm.stipend ? parseFloat(professionalForm.stipend) : null
      }
      await updateEmployeeData(employee.id, dataToSave)
      setIsEditingProfessional(false)
      toast({ title: 'Success', description: 'Professional information updated!' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setIsSavingProfessional(false)
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadEmployeeFileAction(formData)
      
      if (res.success && res.path) {
        const supabase = createClient()
        const { data } = supabase.storage.from('employee-documents').getPublicUrl(res.path)
        
        const newDoc = {
          name: file.name,
          url: data.publicUrl,
          size: file.size,
          type: file.type,
          path: res.path
        }
        
        const currentDocs = Array.isArray(employee.documents) ? employee.documents : []
        const updatedDocs = [...currentDocs, newDoc]
        
        await updateEmployeeData(employee.id, { documents: updatedDocs })
        
        toast({
          title: "Document Uploaded",
          description: "The document has been uploaded successfully.",
        })
        router.refresh()
      } else {
        throw new Error(res.error || 'Upload failed')
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUploadingDoc(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const handleDeleteDocument = async (idx: number) => {
    try {
      const currentDocs = Array.isArray(employee.documents) ? [...employee.documents] : []
      currentDocs.splice(idx, 1)
      
      await updateEmployeeData(employee.id, { documents: currentDocs })
      toast({
        title: "Document Deleted",
        description: "The document has been deleted successfully.",
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 5MB', variant: 'destructive' })
      return
    }

    setIsUploadingPhoto(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `profile-photos/${employee.id}.${fileExt}`

      const objectUrl = URL.createObjectURL(file)
      setLocalPhotoUrl(objectUrl)

      if (employee.profile_photo) {
        await supabase.storage.from('employee-documents').remove([employee.profile_photo])
      }

      const { error: uploadError } = await supabase.storage.from('employee-documents').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      await updateEmployeeData(employee.id, { profile_photo: filePath })
      
      toast({ title: 'Success', description: 'Profile photo updated!' })
      router.refresh()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to upload photo', variant: 'destructive' })
      setLocalPhotoUrl(null)
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const supabase = createClient()
  const photoUrl = employee.profile_photo
    ? supabase.storage.from('employee-documents').getPublicUrl(employee.profile_photo).data.publicUrl
    : null

  const profileCompletion = 100
  const joinedDate = new Date(employee.joining_date)
  const formattedJoined = joinedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  
  let ec = { name: '-', relationship: '-', phone: '-', address: '-' };
  if (employee.emergency_contact) {
    try {
      const parsed = JSON.parse(employee.emergency_contact);
      if (parsed.name || parsed.relationship || parsed.phone) ec = parsed;
    } catch (e) { }
  }

  // --- Field renderers ---
  const iconThemeMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    purple: 'bg-purple-500/10 text-purple-500 dark:text-purple-400',
    rose: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
    indigo: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400',
    orange: 'bg-orange-500/10 text-orange-500 dark:text-orange-400',
    cyan: 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400',
    muted: 'bg-muted/60 text-muted-foreground',
  }

  const renderInfoCard = (icon: React.ReactNode, label: string, value: string | null | undefined, theme: string = 'muted') => (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card transition-colors">
      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", iconThemeMap[theme] || iconThemeMap.muted)}>
        {React.isValidElement(icon) ? React.cloneElement(icon as any, { className: 'w-4 h-4' }) : icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none mb-0.5">{label}</span>
        <span className="text-[13px] font-semibold text-foreground break-all leading-tight">{value || '-'}</span>
      </div>
    </div>
  )

  const renderEditableCard = (icon: React.ReactNode, label: string, value: any, isEditing: boolean, fieldKey: string, formState: any, setFormState: any, type: string = 'text', theme: string = 'muted') => (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card transition-colors">
      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", iconThemeMap[theme] || iconThemeMap.muted)}>
        {React.isValidElement(icon) ? React.cloneElement(icon as any, { className: 'w-4 h-4' }) : icon}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none mb-0.5">{label}</span>
        {isEditing ? (
          <Input
            type={type}
            className="h-7 text-xs bg-transparent border-border"
            value={formState[fieldKey] || ''}
            onChange={e => setFormState((prev: any) => ({ ...prev, [fieldKey]: e.target.value }))}
          />
        ) : (
          <span className="text-[13px] font-semibold text-foreground break-all leading-tight">
            {type === 'date' && value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (value || '-')}
          </span>
        )}
      </div>
    </div>
  )

  // --- Section header with Edit button ---
  const renderSectionHeader = (icon: React.ReactNode, title: string, isEditing: boolean, onEdit: () => void, onCancel: () => void, onSave: () => void, isSaving: boolean, theme: string = 'muted') => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconThemeMap[theme] || iconThemeMap.muted)}>
          {React.isValidElement(icon) ? React.cloneElement(icon as any, { className: 'w-4 h-4' }) : icon}
        </div>
        <h3 className="font-bold text-base text-foreground">{title}</h3>
      </div>
      {isEditing ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" className="bg-foreground text-background h-8 text-xs" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : null} Save
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-transparent border-border/60 hover:bg-muted/60 gap-1.5" onClick={onEdit}>
          <Edit2 className="w-3 h-3" /> Edit
        </Button>
      )}
    </div>
  )

  // --- Profile sidebar card (left column) ---
  const ProfileCard = () => (
    <div className="w-full lg:w-[320px] shrink-0 space-y-4">
      {/* Profile Card */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
        {/* Edit Profile button */}
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] bg-transparent border-border/60 hover:bg-muted/60 gap-1.5" onClick={() => setIsEditingPersonal(true)}>
            <Edit2 className="w-3 h-3" /> Edit Profile
          </Button>
        </div>

        {/* Photo */}
        <div className="flex flex-col items-center">
          <div className="w-[140px] h-[140px] rounded-full overflow-hidden bg-muted border-[3px] border-border/30 shadow-lg mb-4 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {localPhotoUrl || photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={localPhotoUrl || photoUrl!} alt={`${employee.first_name} ${employee.last_name}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground bg-input">
                {employee.first_name[0]}{employee.last_name[0]}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {isUploadingPhoto ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={isUploadingPhoto}
            />
          </div>

          {/* Name + Status */}
          <div className="flex flex-col items-center gap-2 mb-4 w-full">
            <h2 className="text-xl font-bold text-foreground text-center leading-tight max-w-full break-words">
              {employee.first_name} {employee.last_name}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{employee.employee_id_number || 'N/A'}</span>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20 text-[10px] px-2 py-0 h-5 font-semibold">
                Active <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
              </Badge>
              <HodStatusBadge employee={employee} />
            </div>
          </div>
        </div>

        {/* Department, Designation & Joined Date */}
        <div className="flex justify-between items-center mb-4 p-3 rounded-xl border border-border/40 bg-card/40 gap-2">
          
          {/* Left: Dept + Desig */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            
            {/* Department */}
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground font-medium mb-0.5">Department</div>
                <div className="text-xs font-bold text-foreground leading-none truncate">{employee.department || '-'}</div>
              </div>
            </div>
            
            {/* Designation */}
            <div className="flex items-center gap-2.5 w-full">
              <div className="w-8 h-8 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center shrink-0">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground font-medium mb-0.5">Designation</div>
                <div className="text-xs font-bold text-foreground leading-none truncate">{employee.job_title || employee.designation || '-'}</div>
              </div>
            </div>

          </div>

          {/* Vertical Divider */}
          <div className="w-px h-12 bg-border/40 shrink-0" />

          {/* Right: Joined Date */}
          <div className="shrink-0">
            <div className="flex flex-col items-center justify-center border border-emerald-500/20 bg-emerald-500/5 rounded-xl px-2.5 py-2.5 text-center min-w-[90px]">
              <div className="text-[10px] text-muted-foreground font-medium mb-1">Joining Date</div>
              <div className="text-xs font-bold text-foreground mb-1">{formattedJoined}</div>
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <CalendarDays className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-foreground" />
          <h4 className="font-bold text-sm text-foreground">Quick Actions</h4>
        </div>
        <div className="space-y-1.5">
          <button className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors" onClick={() => setIsEditingPersonal(true)}>
            <Edit2 className="w-3.5 h-3.5" /> Edit Employee
          </button>
          <button className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            <Download className="w-3.5 h-3.5" /> Download Profile PDF
          </button>
          <HodAssignmentAction employee={employee} />
          <button className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            <UserX className="w-3.5 h-3.5" /> Deactivate Employee
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col w-full min-w-0">
      <div className="flex items-center justify-start mb-4">
        <button onClick={() => router.push('/hr/onboarding')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal-info" className="w-full max-w-full min-w-0" style={{ maxWidth: '100%' }}>
        <div 
          className="mb-6 w-full max-w-full min-w-0 pb-2 overflow-x-auto scroll-smooth" 
          style={{ width: '100%', maxWidth: '100%' }}
        >
          <TabsList 
            className="bg-card/40 h-10 p-1 border border-border/20 flex items-center justify-start flex-nowrap rounded-xl w-max"
          >
            {[
              { value: 'personal-info', label: 'Personal Info' },
              { value: 'professional-info', label: 'Professional Info' },
              { value: 'documents', label: 'Documents' },
              { value: 'attendance', label: 'Attendance' },
              { value: 'leave-and-time-off', label: 'Leave & Time Off' },
              { value: 'salary-and-hike', label: 'Payroll' },
              { value: 'onboarding', label: 'Onboarding' },
              { value: 'performance', label: 'Performance' },
              { value: 'activity', label: 'Activity' },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground rounded-lg h-8 px-4 font-medium text-xs transition-all whitespace-nowrap"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ============ PERSONAL INFO TAB ============ */}
        <TabsContent value="personal-info" className="m-0">
          <div className="flex flex-col lg:flex-row gap-5">
            <ProfileCard />

            {/* Right content */}
            <div className="flex-1 space-y-5 min-w-0">
              {/* Personal Information */}
              <div className="bg-card/30 border border-border/30 rounded-2xl p-5">
                {renderSectionHeader(
                  <Contact className="w-4 h-4" />,
                  'Personal Information',
                  isEditingPersonal,
                  () => setIsEditingPersonal(true),
                  () => setIsEditingPersonal(false),
                  handleSavePersonal,
                  isSavingPersonal,
                  'blue'
                )}
                <div className="flex items-stretch gap-2.5">
                  <div className="flex-1 min-w-0">
                    {renderEditableCard(<User className="w-4 h-4" />, 'First Name', personalForm.first_name, isEditingPersonal, 'first_name', personalForm, setPersonalForm, 'text', 'blue')}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renderEditableCard(<User className="w-4 h-4" />, 'Last Name', personalForm.last_name, isEditingPersonal, 'last_name', personalForm, setPersonalForm, 'text', 'blue')}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renderEditableCard(<CalendarIcon className="w-4 h-4" />, 'Date of Birth', personalForm.dob, isEditingPersonal, 'dob', personalForm, setPersonalForm, 'date', 'blue')}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renderEditableCard(<Users className="w-4 h-4" />, 'Gender', personalForm.gender, isEditingPersonal, 'gender', personalForm, setPersonalForm, 'text', 'blue')}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-card/30 border border-border/30 rounded-2xl p-5">
                {renderSectionHeader(
                  <Send className="w-4 h-4" />,
                  'Contact Information',
                  isEditingPersonal,
                  () => setIsEditingPersonal(true),
                  () => setIsEditingPersonal(false),
                  handleSavePersonal,
                  isSavingPersonal,
                  'emerald'
                )}
                <div className="flex items-stretch gap-2.5">
                  <div className="w-[55%] min-w-0">
                    {renderEditableCard(<Mail className="w-4 h-4" />, 'Personal Email', personalForm.personal_email, isEditingPersonal, 'personal_email', personalForm, setPersonalForm, 'email', 'emerald')}
                  </div>
                  <div className="flex-1 min-w-0">
                    {renderEditableCard(<Phone className="w-4 h-4" />, 'Phone Number', personalForm.phone, isEditingPersonal, 'phone', personalForm, setPersonalForm, 'tel', 'emerald')}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-card/30 border border-border/30 rounded-2xl p-5">
                {renderSectionHeader(
                  <Map className="w-4 h-4" />,
                  'Address Information',
                  isEditingPersonal,
                  () => setIsEditingPersonal(true),
                  () => setIsEditingPersonal(false),
                  handleSavePersonal,
                  isSavingPersonal,
                  'amber'
                )}
                <div className="flex items-stretch gap-2.5">
                  <div className="w-[55%] min-w-0">
                    {renderEditableCard(<MapPin className="w-4 h-4" />, 'Address', personalForm.address, isEditingPersonal, 'address', personalForm, setPersonalForm, 'text', 'amber')}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card transition-colors flex-1">
                    <div className="w-5 h-5 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider leading-none">City</span>
                      <span className="text-xs font-semibold text-foreground">{employee.city || '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card transition-colors flex-1">
                    <div className="w-5 h-5 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Hash className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider leading-none">PIN Code</span>
                      <span className="text-xs font-semibold text-foreground">{employee.pincode || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-card/30 border border-border/30 rounded-2xl p-5">
                {renderSectionHeader(
                  <ShieldAlert className="w-4 h-4" />,
                  'Emergency Contact',
                  isEditingPersonal,
                  () => setIsEditingPersonal(true),
                  () => setIsEditingPersonal(false),
                  handleSavePersonal,
                  isSavingPersonal,
                  'rose'
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {renderInfoCard(<User className="w-4 h-4" />, 'Contact Name', ec.name, 'rose')}
                  {renderInfoCard(<Users className="w-4 h-4" />, 'Relationship', ec.relationship, 'rose')}
                  {renderInfoCard(<Phone className="w-4 h-4" />, 'Phone Number', ec.phone, 'rose')}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="professional-info" className="m-0 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Professional Information</h3>
                <p className="text-xs text-muted-foreground">Work related details and assignments.</p>
              </div>
            </div>
            {isEditingProfessional ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditingProfessional(false)}>Cancel</Button>
                <Button size="sm" className="bg-foreground text-background" onClick={handleSaveProfessional} disabled={isSavingProfessional}>
                  {isSavingProfessional ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-muted/60 h-8 px-3 text-xs gap-1.5" onClick={() => setIsEditingProfessional(true)}>
                <Edit2 className="w-3 h-3" /> Edit
              </Button>
            )}
          </div>

          <div className="bg-card/30 border border-border/30 rounded-2xl p-5">
            <div className="space-y-6">
              {/* Employment Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <h4 className="font-semibold text-sm">Employment Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {renderEditableCard(<Hash className="w-4 h-4 text-muted-foreground" />, 'Employee ID', professionalForm.employee_id_number, isEditingProfessional, 'employee_id_number', professionalForm, setProfessionalForm, 'text', 'purple')}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card transition-colors">
                    <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none mb-0.5">Department</span>
                      {isEditingProfessional ? (
                        <Select value={professionalForm.department} onValueChange={v => setProfessionalForm(p => ({ ...p, department: v as string, division: '', designation: '' }))}>
                          <SelectTrigger className="h-8 bg-transparent border-border"><SelectValue placeholder="Select Department" /></SelectTrigger>
                          <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-sm font-semibold text-foreground">{professionalForm.department || '-'}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card transition-colors">
                    <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none mb-0.5">Division</span>
                      {isEditingProfessional ? (
                        <Select value={professionalForm.division} onValueChange={v => setProfessionalForm(p => ({ ...p, division: v as string, designation: '' }))} disabled={!professionalForm.department}>
                          <SelectTrigger className="h-8 bg-transparent border-border"><SelectValue placeholder="Select Division" /></SelectTrigger>
                          <SelectContent>{professionalForm.department && DIVISIONS[professionalForm.department]?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-sm font-semibold text-foreground">{professionalForm.division || '-'}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/40 bg-card/60 hover:bg-card transition-colors">
                    <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-500 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none mb-0.5">Designation</span>
                      {isEditingProfessional ? (
                        <Select value={professionalForm.designation} onValueChange={v => setProfessionalForm(p => ({ ...p, designation: v as string }))} disabled={!professionalForm.division}>
                          <SelectTrigger className="h-8 bg-transparent border-border"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                          <SelectContent>{professionalForm.division && DESIGNATIONS[professionalForm.division]?.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-sm font-semibold text-foreground">{professionalForm.designation || '-'}</span>}
                    </div>
                  </div>
                  {renderEditableCard(<Briefcase className="w-4 h-4" />, 'Employment Type', professionalForm.employment_type, isEditingProfessional, 'employment_type', professionalForm, setProfessionalForm, 'text', 'purple')}
                  {renderEditableCard(<CalendarIcon className="w-4 h-4" />, 'Date of Joining', professionalForm.joining_date, isEditingProfessional, 'joining_date', professionalForm, setProfessionalForm, 'date', 'purple')}
                  {professionalForm.employment_type === 'Intern' 
                    ? renderEditableCard(<Banknote className="w-4 h-4" />, 'Stipend', professionalForm.stipend ? `₹${professionalForm.stipend}` : '-', isEditingProfessional, 'stipend', professionalForm, setProfessionalForm, 'text', 'emerald')
                    : renderEditableCard(<Banknote className="w-4 h-4" />, 'Salary', professionalForm.salary ? `₹${professionalForm.salary}` : '-', isEditingProfessional, 'salary', professionalForm, setProfessionalForm, 'text', 'emerald')
                  }
                </div>
              </div>

              {/* Work Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                  <h4 className="font-semibold text-sm">Work Contact</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {renderEditableCard(<Mail className="w-4 h-4" />, 'Work Email', professionalForm.email, isEditingProfessional, 'email', professionalForm, setProfessionalForm, 'email', 'cyan')}
                  {renderInfoCard(<MapPin className="w-4 h-4" />, 'Work Location', 'Satara (Office)', 'amber')}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============ DOCUMENTS TAB ============ */}
        <TabsContent value="documents" className="m-0 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Uploaded Documents</h3>
                <p className="text-xs text-muted-foreground">Files and documents related to the employee.</p>
              </div>
            </div>
            <div>
              <input 
                type="file" 
                ref={docInputRef} 
                className="hidden" 
                onChange={handleDocumentUpload} 
              />
              <Button 
                variant="default" 
                size="sm" 
                className="h-8 px-4 text-xs font-semibold gap-1.5 shadow-sm"
                onClick={() => docInputRef.current?.click()}
                disabled={isUploadingDoc}
              >
                {isUploadingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} 
                {isUploadingDoc ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>

          <div className="bg-card/30 border border-border/30 rounded-2xl p-5">
            {(!employee.documents || employee.documents.length === 0) ? (
              <div className="text-muted-foreground text-sm text-center py-12 border border-dashed border-border/40 rounded-xl bg-background/30">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20 text-blue-500" />
                <p className="font-medium text-foreground">No documents uploaded yet</p>
                <p className="mt-1 text-xs">Documents added during onboarding or later will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {employee.documents.map((doc: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 border border-border/40 rounded-xl bg-card/60 hover:bg-card transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium truncate" title={doc.name || (typeof doc === 'string' ? doc : 'Document')}>
                          {doc.name || (typeof doc === 'string' ? doc : 'Document')}
                        </div>
                        {doc.size && <div className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => window.open(doc.url || '#', '_blank')} title="View Document">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <ConfirmModal
                        title="Delete Document"
                        description="Are you sure you want to delete this document? This action cannot be undone."
                        onConfirm={() => handleDeleteDocument(idx)}
                        confirmText="Delete"
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Delete Document">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </ConfirmModal>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============ ONBOARDING TAB ============ */}
        <TabsContent value="onboarding" className="m-0 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Onboarding Status</h3>
              <p className="text-xs text-muted-foreground">Progress and important dates.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card/30 border border-border/30 rounded-2xl p-6 flex flex-col items-center justify-center">
              <div className="font-semibold mb-6">Profile Completion</div>
              <div className="w-32 h-32 relative flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-input" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray={`${profileCompletion * 2.827} 282.7`} className="text-foreground" strokeLinecap="round" />
                </svg>
                <div className="absolute font-bold text-3xl text-foreground">{profileCompletion}%</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-foreground">Profile Complete</div>
                <div className="text-xs text-muted-foreground mt-1">All information has been provided.</div>
              </div>
            </div>

            <div className="bg-card/30 border border-border/30 rounded-2xl p-6">
              <div className="font-semibold mb-6 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Important Dates
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/60">
                  <div className="text-sm text-muted-foreground">Date of Joining</div>
                  <div className="text-sm font-semibold">{formattedJoined}</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/60">
                  <div className="text-sm text-muted-foreground">Probation End Date</div>
                  <div className="text-sm font-semibold">{employee.probation_end_date ? new Date(employee.probation_end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/60">
                  <div className="text-sm text-muted-foreground">Employment Type</div>
                  <div className="text-sm font-semibold">{employee.employment_type || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============ SALARY & HIKE TAB ============ */}
        <TabsContent value="salary-and-hike" className="m-0">
          <SalaryAndHikeTab employee={employee} />
        </TabsContent>
        
        {/* ============ PLACEHOLDER TABS ============ */}
        <TabsContent value="attendance" className="m-0">
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border/40 rounded-2xl bg-card/20">
            <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20 text-emerald-500" />
            <p className="font-medium text-foreground">Attendance module pending</p>
            <p className="mt-1 text-xs text-muted-foreground">This section will show attendance records.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="leave-and-time-off" className="m-0">
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border/40 rounded-2xl bg-card/20">
            <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-20 text-rose-500" />
            <p className="font-medium text-foreground">Leave & Time Off module pending</p>
            <p className="mt-1 text-xs text-muted-foreground">This section will show leave history.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="m-0">
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border/40 rounded-2xl bg-card/20">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20 text-amber-500" />
            <p className="font-medium text-foreground">Performance module pending</p>
            <p className="mt-1 text-xs text-muted-foreground">This section will show performance reviews.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="activity" className="m-0">
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border/40 rounded-2xl bg-card/20">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-20 text-purple-500" />
            <p className="font-medium text-foreground">Activity Log pending</p>
            <p className="mt-1 text-xs text-muted-foreground">This section will show employee activity timeline.</p>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
