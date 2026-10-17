'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  ChevronLeft, ChevronRight, Zap, UserX, Code2, Globe, Trash2,
  Clock, BarChart3, Bell, Calendar, UploadCloud
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
import { ChangePasswordAction } from '@/components/hr/onboarding/change-password-action'
import { HodStatusBadge } from '@/components/hr/onboarding/hod-status-badge'
import { EmployeeAttendanceCalendar } from '@/components/hr/onboarding/employee-attendance-calendar'
import { EmployeeSecurityAuditTab } from '@/components/hr/onboarding/employee-security-audit-tab'
import { DeactivateEmployeeAction } from '@/components/hr/onboarding/deactivate-employee-action'

export function EmployeeDetailsClient({ employee }: { employee: Employee }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [isDraggingDoc, setIsDraggingDoc] = useState(false)
  const dragCounter = useRef(0)
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null)
  const [isHod, setIsHod] = useState<boolean>(Boolean(employee.is_hod))
  const [employmentStatus, setEmploymentStatus] = useState<string>(employee.employment_status || 'Active')

  useEffect(() => {
    setIsHod(Boolean(employee.is_hod))
  }, [employee.is_hod])

  useEffect(() => {
    setEmploymentStatus(employee.employment_status || 'Active')
  }, [employee.employment_status])

  const [isEditingPersonalAddress, setIsEditingPersonalAddress] = useState(false)
  const [isSavingPersonalAddress, setIsSavingPersonalAddress] = useState(false)

  const [isEditingContactEmergency, setIsEditingContactEmergency] = useState(false)
  const [isSavingContactEmergency, setIsSavingContactEmergency] = useState(false)

  const [isSavingAll, setIsSavingAll] = useState(false)
  const { toast } = useToast()

  let initialEc = { name: '', relationship: '', phone: '', address: '' };
  if (employee.emergency_contact) {
    try {
      const parsed = JSON.parse(employee.emergency_contact);
      if (parsed.name || parsed.relationship || parsed.phone) initialEc = parsed;
    } catch (e) { }
  }

  const [personalForm, setPersonalForm] = useState({
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    dob: employee.dob || '',
    gender: employee.gender || '',
    phone: employee.phone || '',
    personal_email: employee.personal_email || '',
    address: employee.address || '',
    city: employee.city || '',
    pincode: employee.pincode || '',
    emergency_name: initialEc.name || '',
    emergency_relationship: initialEc.relationship || '',
    emergency_phone: initialEc.phone || ''
  })

  useEffect(() => {
    let ec = { name: '', relationship: '', phone: '', address: '' };
    if (employee.emergency_contact) {
      try {
        const parsed = JSON.parse(employee.emergency_contact);
        if (parsed.name || parsed.relationship || parsed.phone) ec = parsed;
      } catch (e) { }
    }
    setPersonalForm({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      dob: employee.dob || '',
      gender: employee.gender || '',
      phone: employee.phone || '',
      personal_email: employee.personal_email || '',
      address: employee.address || '',
      city: employee.city || '',
      pincode: employee.pincode || '',
      emergency_name: ec.name || '',
      emergency_relationship: ec.relationship || '',
      emergency_phone: ec.phone || ''
    })
  }, [employee])

  const handleCancelPersonalAddress = () => {
    setPersonalForm(prev => ({
      ...prev,
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      dob: employee.dob || '',
      gender: employee.gender || '',
      address: employee.address || '',
      city: employee.city || '',
      pincode: employee.pincode || '',
    }))
    setIsEditingPersonalAddress(false)
  }

  const handleSavePersonalAddress = async () => {
    setIsSavingPersonalAddress(true)
    try {
      const dataToSave = {
        first_name: personalForm.first_name,
        last_name: personalForm.last_name,
        dob: personalForm.dob || null,
        gender: personalForm.gender || null,
        address: personalForm.address || null,
        city: personalForm.city || null,
        pincode: personalForm.pincode || null,
      }
      await updateEmployeeData(employee.id, dataToSave)
      setIsEditingPersonalAddress(false)
      toast({ title: 'Success', description: 'Personal & address information updated!' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update personal & address information', variant: 'destructive' })
    } finally {
      setIsSavingPersonalAddress(false)
    }
  }

  const handleCancelContactEmergency = () => {
    setPersonalForm(prev => ({
      ...prev,
      personal_email: employee.personal_email || '',
      phone: employee.phone || '',
      emergency_name: initialEc.name || '',
      emergency_relationship: initialEc.relationship || '',
      emergency_phone: initialEc.phone || '',
    }))
    setIsEditingContactEmergency(false)
  }

  const handleSaveContactEmergency = async () => {
    setIsSavingContactEmergency(true)
    try {
      const dataToSave = {
        personal_email: personalForm.personal_email || null,
        phone: personalForm.phone || null,
        emergency_contact: JSON.stringify({
          name: personalForm.emergency_name,
          relationship: personalForm.emergency_relationship,
          phone: personalForm.emergency_phone
        })
      }
      await updateEmployeeData(employee.id, dataToSave)
      setIsEditingContactEmergency(false)
      toast({ title: 'Success', description: 'Contact & emergency contact updated!' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update contact & emergency contact', variant: 'destructive' })
    } finally {
      setIsSavingContactEmergency(false)
    }
  }

  const handleSaveAll = async () => {
    setIsSavingAll(true)
    try {
      const dataToSave = {
        first_name: personalForm.first_name,
        last_name: personalForm.last_name,
        dob: personalForm.dob || null,
        gender: personalForm.gender || null,
        phone: personalForm.phone || null,
        personal_email: personalForm.personal_email || null,
        address: personalForm.address || null,
        city: personalForm.city || null,
        pincode: personalForm.pincode || null,
        emergency_contact: JSON.stringify({
          name: personalForm.emergency_name,
          relationship: personalForm.emergency_relationship,
          phone: personalForm.emergency_phone
        })
      }
      await updateEmployeeData(employee.id, dataToSave)
      setIsEditingPersonalAddress(false)
      setIsEditingContactEmergency(false)
      toast({ title: 'Success', description: 'Employee information updated!' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update employee information', variant: 'destructive' })
    } finally {
      setIsSavingAll(false)
    }
  }

  // Backwards compatibility alias for other components if needed
  const isEditingPersonal = isEditingPersonalAddress || isEditingContactEmergency
  const isSavingPersonal = isSavingPersonalAddress || isSavingContactEmergency || isSavingAll
  const handleSavePersonal = handleSaveAll
  const handleCancelPersonal = () => {
    handleCancelPersonalAddress()
    handleCancelContactEmergency()
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

  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return

    setIsUploadingDoc(true)
    try {
      const supabase = createClient()
      const newDocs: any[] = []

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 10MB file size limit.`)
        }

        const formData = new FormData()
        formData.append('file', file)
        const res = await uploadEmployeeFileAction(formData)

        if (res.success && res.path) {
          const { data } = supabase.storage.from('employee-documents').getPublicUrl(res.path)
          newDocs.push({
            name: file.name,
            url: data.publicUrl,
            size: file.size,
            type: file.type,
            path: res.path
          })
        } else {
          throw new Error(res.error || `Failed to upload "${file.name}"`)
        }
      }

      if (newDocs.length > 0) {
        const currentDocs = Array.isArray(employee.documents) ? employee.documents : []
        const updatedDocs = [...currentDocs, ...newDocs]

        await updateEmployeeData(employee.id, { documents: updatedDocs })

        toast({
          title: newDocs.length > 1 ? `${newDocs.length} Documents Uploaded` : "Document Uploaded",
          description: newDocs.length > 1 
            ? "All documents uploaded successfully." 
            : "The document has been uploaded successfully.",
        })
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || 'Failed to upload document',
        variant: "destructive",
      })
    } finally {
      setIsUploadingDoc(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files))
    }
  }

  const handleDocDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingDoc(true)
    }
  }

  const handleDocDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      setIsDraggingDoc(false)
      dragCounter.current = 0
    }
  }

  const handleDocDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingDoc(false)
    dragCounter.current = 0
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files))
      e.dataTransfer.clearData()
    }
  }

  const handleViewDocument = (e: React.MouseEvent, doc: any) => {
    e.preventDefault()
    e.stopPropagation()

    let urlToOpen = '#'
    if (typeof doc === 'string') {
      if (doc.startsWith('http')) {
        urlToOpen = doc
      } else {
        const { data } = supabase.storage.from('employee-documents').getPublicUrl(doc)
        urlToOpen = data.publicUrl
      }
    } else if (doc?.url) {
      urlToOpen = doc.url
    } else if (doc?.path) {
      const { data } = supabase.storage.from('employee-documents').getPublicUrl(doc.path)
      urlToOpen = data.publicUrl
    }

    if (urlToOpen && urlToOpen !== '#') {
      window.open(urlToOpen, '_blank')
    } else {
      toast({ title: 'Error', description: 'Could not find document URL', variant: 'destructive' })
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

  // ec is now parsed at the top using initialEc, but we can reuse it here for any other purposes if needed, though it's already in personalForm.

  const formatDateDisplay = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        const d = new Date(year, month, day)
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      }
      const d = new Date(dateStr)
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr || '-'
    }
  }

  const formatGenderDisplay = (val: string | null | undefined) => {
    if (!val) return '-'
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
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
    </div>
  )

  // --- Profile sidebar card (left column) ---
  const ProfileCard = () => (
    <div className="w-full lg:w-[320px] shrink-0 space-y-4">
      {/* Profile Card */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
        {/* Edit Profile button removed */}

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
              <Badge className={cn(
                "text-[10px] px-2 py-0 h-5 font-semibold",
                employmentStatus === 'Inactive' || employmentStatus === 'Terminated'
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/25 hover:bg-rose-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
              )}>
                {employmentStatus} <span className={cn(
                  "inline-block w-1.5 h-1.5 rounded-full ml-1",
                  employmentStatus === 'Inactive' || employmentStatus === 'Terminated'
                    ? "bg-rose-400"
                    : "bg-emerald-400"
                )} />
              </Badge>
              <HodStatusBadge employee={employee} isHod={isHod} />
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
        <div className="flex flex-col gap-2">
          {(isEditingPersonalAddress || isEditingContactEmergency) ? (
            <button
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
              onClick={handleSaveAll}
              disabled={isSavingAll || isSavingPersonalAddress || isSavingContactEmergency}
            >
              {(isSavingAll || isSavingPersonalAddress || isSavingContactEmergency) ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {(isSavingAll || isSavingPersonalAddress || isSavingContactEmergency) ? 'Saving...' : 'Save Employee'}
            </button>
          ) : (
            <button
              className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
              onClick={() => {
                setIsEditingPersonalAddress(true)
                setIsEditingContactEmergency(true)
              }}
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Employee
            </button>
          )}
          <button className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
            <Download className="w-3.5 h-3.5" /> Download Profile PDF
          </button>
          <ChangePasswordAction employee={employee} />
          <HodAssignmentAction employee={employee} onHodChange={setIsHod} />
          <DeactivateEmployeeAction
            employee={employee}
            currentStatus={employmentStatus}
            onStatusChange={setEmploymentStatus}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col w-full min-w-0">
      {/* Tabs */}
      <Tabs defaultValue="personal-info" className="w-full max-w-full min-w-0" style={{ maxWidth: '100%' }}>
        <div className="mb-6 flex items-center gap-1.5 sm:gap-2 w-full flex-nowrap">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push('/hr/onboarding')}
            className="shrink-0 inline-flex items-center gap-1.5 h-8 sm:h-9 px-[9px] sm:px-[11px] rounded-xl border border-border/50 dark:border-zinc-800/80 bg-card/40 dark:bg-zinc-950/60 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/40 hover:border-border transition-all cursor-pointer select-none"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-foreground/80" />
            <span>Back</span>
          </button>

          {/* Single Horizontal Line Tabs (Responsive, screen-size adaptive) */}
          <TabsList
            className="bg-card/40 dark:bg-zinc-950/60 h-8 sm:h-9 group-data-horizontal/tabs:h-8 sm:group-data-horizontal/tabs:h-9 p-0.5 sm:p-1 border border-border/50 dark:border-zinc-800/80 inline-flex items-center justify-start flex-nowrap rounded-xl w-auto max-w-full gap-1.5 shrink-0 overflow-x-auto no-scrollbar"
          >
            {[
              { value: 'personal-info', label: 'Personal', fullLabel: 'Personal Info', icon: User },
              { value: 'professional-info', label: 'Professional', fullLabel: 'Professional Info', icon: Briefcase },
              { value: 'documents', label: 'Documents', fullLabel: 'Documents', icon: FileText },
              { value: 'attendance', label: 'Attendance', fullLabel: 'Attendance', icon: Calendar },
              { value: 'salary-and-hike', label: 'Salary Slip', fullLabel: 'Salary Slip', icon: CreditCard },
              { value: 'onboarding', label: 'Onboarding', fullLabel: 'Onboarding', icon: Users },
              { value: 'performance', label: 'Performance', fullLabel: 'Performance', icon: BarChart3 },
              { value: 'activity', label: 'Activity', fullLabel: 'Activity', icon: Bell },
            ].map(tab => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-7 sm:h-7.5 px-[8px] sm:px-[10px] xl:px-[12px] 2xl:px-[13px] rounded-lg text-[11px] sm:text-[11.5px] 2xl:text-xs font-medium transition-all whitespace-nowrap inline-flex items-center gap-1.5 text-muted-foreground dark:text-zinc-400 hover:text-foreground hover:bg-transparent border border-transparent data-[state=active]:border-zinc-500/80 dark:data-[state=active]:border-zinc-600/90 data-[state=active]:bg-card dark:data-[state=active]:bg-zinc-900/90 data-[state=active]:text-foreground data-[state=active]:shadow-xs data-active:border-zinc-500/80 dark:data-active:border-zinc-600/90 data-active:bg-card dark:data-active:bg-zinc-900/90 data-active:text-foreground data-active:shadow-xs after:hidden shrink-0"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-80 data-[state=active]:opacity-100 data-active:opacity-100" />
                  <span>
                    {tab.label}
                    {tab.fullLabel !== tab.label && (
                      <span className="hidden 2xl:inline">
                        {tab.fullLabel.slice(tab.label.length)}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* ============ PERSONAL INFO TAB ============ */}
        <TabsContent value="personal-info" className="m-0">
          <div className="flex flex-col lg:flex-row gap-5">
            <ProfileCard />

            {/* Right content */}
            <div className="flex-1 space-y-5 min-w-0">
              {/* 1. Personal & Address Information Card */}
              <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Contact className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base md:text-lg text-foreground leading-tight truncate">
                        Personal & Address Information
                      </h3>
                    </div>
                  </div>
                  {isEditingPersonalAddress && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelPersonalAddress}
                        disabled={isSavingPersonalAddress}
                        className="h-8 px-3 rounded-full text-xs hover:bg-muted/50 cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSavePersonalAddress}
                        disabled={isSavingPersonalAddress}
                        className="h-8 px-3.5 rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-medium cursor-pointer"
                      >
                        {isSavingPersonalAddress ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                {/* Personal details row (4 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* First Name */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        FIRST NAME
                      </span>
                      {isEditingPersonalAddress ? (
                        <Input
                          value={personalForm.first_name}
                          onChange={e => setPersonalForm(prev => ({ ...prev, first_name: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="First Name"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.first_name || '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        LAST NAME
                      </span>
                      {isEditingPersonalAddress ? (
                        <Input
                          value={personalForm.last_name}
                          onChange={e => setPersonalForm(prev => ({ ...prev, last_name: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="Last Name"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.last_name || '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1 whitespace-nowrap">
                        DATE OF BIRTH
                      </span>
                      {isEditingPersonalAddress ? (
                        <Input
                          type="date"
                          value={personalForm.dob}
                          onChange={e => setPersonalForm(prev => ({ ...prev, dob: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap leading-tight">
                          {formatDateDisplay(personalForm.dob)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        GENDER
                      </span>
                      {isEditingPersonalAddress ? (
                        <Select
                          value={personalForm.gender?.toLowerCase() || ''}
                          onValueChange={val => setPersonalForm(prev => ({ ...prev, gender: val || '' }))}
                        >
                          <SelectTrigger className="h-7 text-xs bg-background/50 border-border/60 capitalize">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {formatGenderDisplay(personalForm.gender)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-border/30 dark:border-zinc-800/80 my-3.5" />

                {/* Address details row (3 columns with wider address field) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Full Address */}
                  <div className="md:col-span-6 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        ADDRESS
                      </span>
                      {isEditingPersonalAddress ? (
                        <Input
                          value={personalForm.address}
                          onChange={e => setPersonalForm(prev => ({ ...prev, address: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="Address"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground break-words leading-tight" title={personalForm.address || ''}>
                          {personalForm.address || '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* City */}
                  <div className="md:col-span-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        CITY
                      </span>
                      {isEditingPersonalAddress ? (
                        <Input
                          value={personalForm.city}
                          onChange={e => setPersonalForm(prev => ({ ...prev, city: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="City"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.city || '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PIN Code */}
                  <div className="md:col-span-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        PIN CODE
                      </span>
                      {isEditingPersonalAddress ? (
                        <Input
                          value={personalForm.pincode}
                          onChange={e => setPersonalForm(prev => ({ ...prev, pincode: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="PIN Code"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.pincode || '-'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Contact & Emergency Contact Card */}
              <div className="bg-card/40 dark:bg-zinc-950/40 border border-border/40 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base md:text-lg text-foreground leading-tight truncate">
                        Contact & Emergency Contact
                      </h3>
                    </div>
                  </div>
                  {isEditingContactEmergency && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelContactEmergency}
                        disabled={isSavingContactEmergency}
                        className="h-8 px-3 rounded-full text-xs hover:bg-muted/50 cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveContactEmergency}
                        disabled={isSavingContactEmergency}
                        className="h-8 px-3.5 rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-medium cursor-pointer"
                      >
                        {isSavingContactEmergency ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                {/* Primary contact row (2 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Personal Email */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        PERSONAL EMAIL
                      </span>
                      {isEditingContactEmergency ? (
                        <Input
                          type="email"
                          value={personalForm.personal_email}
                          onChange={e => setPersonalForm(prev => ({ ...prev, personal_email: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="Personal Email"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.personal_email || '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        PHONE NUMBER
                      </span>
                      {isEditingContactEmergency ? (
                        <Input
                          type="tel"
                          value={personalForm.phone}
                          onChange={e => setPersonalForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="Phone Number"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.phone || '-'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-border/30 dark:border-zinc-800/80 my-3.5" />

                {/* Emergency contact row (3 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Emergency Contact Name */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        EMERGENCY CONTACT NAME
                      </span>
                      {isEditingContactEmergency ? (
                        <Input
                          value={personalForm.emergency_name}
                          onChange={e => setPersonalForm(prev => ({ ...prev, emergency_name: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="Contact Name"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.emergency_name || '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Relationship */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        RELATIONSHIP
                      </span>
                      {isEditingContactEmergency ? (
                        <Input
                          value={personalForm.emergency_relationship}
                          onChange={e => setPersonalForm(prev => ({ ...prev, emergency_relationship: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="Relationship"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.emergency_relationship || '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Emergency Phone Number */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-card/60 dark:bg-zinc-900/40 hover:bg-card/80 transition-colors min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none mb-1">
                        EMERGENCY PHONE NUMBER
                      </span>
                      {isEditingContactEmergency ? (
                        <Input
                          type="tel"
                          value={personalForm.emergency_phone}
                          onChange={e => setPersonalForm(prev => ({ ...prev, emergency_phone: e.target.value }))}
                          className="h-7 text-xs bg-background/50 border-border/60"
                          placeholder="Emergency Phone"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-foreground truncate leading-tight">
                          {personalForm.emergency_phone || '-'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="professional-info" className="m-0 space-y-5">
          {isEditingProfessional && (
            <div className="flex justify-end gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingProfessional(false)}>Cancel</Button>
              <Button size="sm" className="bg-foreground text-background" onClick={handleSaveProfessional} disabled={isSavingProfessional}>
                {isSavingProfessional ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
              </Button>
            </div>
          )}

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
              <div className="w-10 h-10 rounded-xl bg-muted/50 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800/80 text-foreground flex items-center justify-center shrink-0">
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
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
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

          <div
            onDragEnter={handleDocDragEnter}
            onDragLeave={handleDocDragLeave}
            onDragOver={handleDocDragOver}
            onDrop={handleDocDrop}
            className={cn(
              "relative bg-card/30 border rounded-2xl p-5 transition-all duration-200",
              isDraggingDoc 
                ? "border-foreground/80 dark:border-zinc-300 bg-muted/30 dark:bg-zinc-900/60 ring-2 ring-foreground/20" 
                : "border-border/30"
            )}
          >
            {/* Active Drop Backdrop Overlay */}
            {isDraggingDoc && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 dark:bg-zinc-950/90 backdrop-blur-xs rounded-2xl border-2 border-dashed border-foreground/80 dark:border-zinc-300 pointer-events-none animate-in fade-in duration-150">
                <div className="w-14 h-14 rounded-2xl bg-muted dark:bg-zinc-900 border border-border/50 dark:border-zinc-700 text-foreground flex items-center justify-center mb-3 scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-base font-semibold text-foreground">Drop files here to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, PNG, JPG (up to 10MB)</p>
              </div>
            )}

            {/* Empty State / Interactive Drag & Drop Box */}
            {(!employee.documents || employee.documents.length === 0) ? (
              <div
                onClick={() => docInputRef.current?.click()}
                className={cn(
                  "cursor-pointer text-center py-14 px-6 border-2 border-dashed rounded-xl transition-all duration-200 group select-none",
                  isDraggingDoc
                    ? "border-foreground/80 dark:border-zinc-300 bg-muted/40 dark:bg-zinc-900/60"
                    : "border-border/60 bg-muted/10 dark:bg-zinc-950/40 hover:border-foreground/60 hover:bg-muted/20"
                )}
              >
                {isUploadingDoc ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-foreground mb-3" />
                    <p className="font-semibold text-foreground text-sm">Uploading document(s)...</p>
                    <p className="text-xs text-muted-foreground mt-1">Please wait while files are being securely stored</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted/60 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800 text-foreground flex items-center justify-center mb-3 group-hover:scale-105 group-hover:border-foreground/40 transition-all">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <p className="font-semibold text-base text-foreground mb-1">
                      Drag &amp; drop documents here, or <span className="text-foreground underline underline-offset-4 decoration-muted-foreground/60 hover:decoration-foreground font-semibold transition-colors">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, DOCX, XLSX, PNG, JPG, ZIP (Max 10MB per file)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Compact Drag & Drop Strip above existing files */}
                <div
                  onClick={() => docInputRef.current?.click()}
                  className={cn(
                    "cursor-pointer border-2 border-dashed rounded-xl p-3.5 flex items-center justify-center gap-3 transition-all duration-200 group select-none",
                    isDraggingDoc
                      ? "border-foreground/80 dark:border-zinc-300 bg-muted/40 dark:bg-zinc-900/60"
                      : "border-border/60 bg-muted/10 dark:bg-zinc-950/40 hover:border-foreground/60 hover:bg-muted/20"
                  )}
                >
                  {isUploadingDoc ? (
                    <div className="flex items-center gap-2 py-0.5">
                      <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                      <span className="text-xs font-medium text-foreground">Uploading document(s)...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-muted/60 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800 text-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-foreground">Drag &amp; drop more documents here</span>
                        <span className="text-muted-foreground">, or <span className="text-foreground underline underline-offset-2 decoration-muted-foreground/60 hover:decoration-foreground font-medium transition-colors">browse files</span> (up to 10MB)</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Existing Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {employee.documents.map((doc: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 border border-border/40 rounded-xl bg-card/60 hover:bg-card transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-muted/60 dark:bg-zinc-900 border border-border/50 dark:border-zinc-800 text-foreground flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium truncate" title={doc.name || (typeof doc === 'string' ? doc : 'Document')}>
                            {(doc.name || (typeof doc === 'string' ? doc : 'Document')).replace(/\.[^/.]+$/, "")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => handleViewDocument(e, doc)} title="View Document">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <ConfirmModal
                          title="Delete Document"
                          description="Are you sure you want to delete this document? This action cannot be undone."
                          onConfirm={() => handleDeleteDocument(idx)}
                          confirmText="Delete"
                        >
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Delete Document" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </ConfirmModal>
                      </div>
                    </div>
                  ))}
                </div>
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

        {/* ============ ATTENDANCE TAB ============ */}
        <TabsContent value="attendance" className="m-0">
          <EmployeeAttendanceCalendar employee={employee} />
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

        {/* ============ ACTIVITY / SECURITY AUDIT TAB ============ */}
        <TabsContent value="activity" className="m-0">
          <EmployeeSecurityAuditTab employee={employee} />
        </TabsContent>

      </Tabs>
    </div>
  )
}


