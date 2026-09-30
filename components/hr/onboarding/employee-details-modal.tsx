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
  Building2, CreditCard, Banknote, CalendarCheck2, Activity
} from 'lucide-react'
import { Employee } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { updateEmployeeData } from '@/lib/actions/onboarding'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEPARTMENTS, DIVISIONS, DESIGNATIONS } from '@/config/roles'

import { SalaryAndHikeTab } from '@/components/hr/payroll/salary-and-hike-tab'

export function EmployeeDetailsClient({ employee }: { employee: Employee }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
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
    reporting_manager: employee.reporting_manager || '',
    email: employee.email || '',
    salary: employee.salary ? employee.salary.toString() : ''
  })

  const handleSaveProfessional = async () => {
    setIsSavingProfessional(true)
    try {
      const dataToSave = {
        ...professionalForm,
        job_title: professionalForm.designation,
        salary: professionalForm.salary ? parseFloat(professionalForm.salary) : null
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

  const renderField = (icon: React.ReactNode, label: string, value: any, isEditing: boolean, fieldKey: string, formState: any, setFormState: any, type: string = 'text') => {
    return (
      <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          {React.cloneElement(icon as any, { className: "w-3.5 h-3.5" })}
          {label}
        </div>
        <div className="pl-5">
          {isEditing ? (
             <Input
               type={type}
               className="h-8 text-sm bg-transparent border-border flex-1"
               value={formState[fieldKey] || ''}
               onChange={e => setFormState((prev: any) => ({ ...prev, [fieldKey]: e.target.value }))}
             />
          ) : (
             <div className="text-sm font-semibold text-foreground break-all">
               {type === 'date' && value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) :
                (value || '-')}
             </div>
          )}
        </div>
      </div>
    )
  }

  const renderStaticField = (icon: React.ReactNode, label: string, value: string) => {
    return (
      <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          {React.cloneElement(icon as any, { className: "w-3.5 h-3.5" })}
          {label}
        </div>
        <div className="pl-5">
           <div className="text-sm font-semibold text-foreground break-all">
             {value || '-'}
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      <div className="flex-1 w-full">
        <Tabs defaultValue="personal-info" className="w-full">
          <div className="mb-6 overflow-x-auto custom-scrollbar pb-2">
            <TabsList className="bg-transparent h-auto p-0 border-none flex items-center gap-2 justify-start w-max">
              <TabsTrigger value="personal-info" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <User className="w-4 h-4" /> Personal Info
              </TabsTrigger>
              <TabsTrigger value="professional-info" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <Briefcase className="w-4 h-4" /> Professional Info
              </TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <FileText className="w-4 h-4" /> Documents
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <CalendarDays className="w-4 h-4" /> Attendance
              </TabsTrigger>
              <TabsTrigger value="leave-and-time-off" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <CalendarIcon className="w-4 h-4" /> Leave & Time Off
              </TabsTrigger>
              <TabsTrigger value="salary-and-hike" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <Banknote className="w-4 h-4" /> Salary & Hike
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <Mail className="w-4 h-4" /> Onboarding
              </TabsTrigger>
              <TabsTrigger value="performance" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <Activity className="w-4 h-4" /> Performance
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-muted-foreground bg-card border border-border/60 hover:bg-card/80 rounded-full h-10 px-5 font-semibold text-sm flex items-center gap-2 transition-all">
                <Droplet className="w-4 h-4" /> Activity
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="personal-info" className="m-0 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Personal Information</h3>
                  <p className="text-xs text-muted-foreground">Basic personal details of the employee.</p>
                </div>
              </div>
              {isEditingPersonal ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingPersonal(false)}>Cancel</Button>
                  <Button size="sm" className="bg-foreground text-background" onClick={handleSavePersonal} disabled={isSavingPersonal}>
                    {isSavingPersonal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-input h-9 px-4" onClick={() => setIsEditingPersonal(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Profile Box */}
              <div className="w-full lg:w-[280px] shrink-0 bg-card/40 border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center h-fit shadow-sm">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-input shadow-lg mb-5 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {localPhotoUrl || photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={localPhotoUrl || photoUrl!} alt={`${employee.first_name} ${employee.last_name}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingPhoto ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </div>
                  <div className="absolute bottom-1 right-1 w-7 h-7 bg-background rounded-full flex items-center justify-center shadow-md border border-border">
                    <Camera className="w-3.5 h-3.5 text-foreground" />
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
                <h2 className="text-lg font-bold text-foreground mb-1">{employee.first_name} {employee.last_name}</h2>
                <p className="text-xs text-muted-foreground font-medium mb-4">{employee.job_title}</p>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20 shadow-sm">
                  Employee ID: {employee.employee_id_number || 'N/A'}
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex-1 space-y-6">
                
                {/* Basic Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Basic Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField(<User className="w-3.5 h-3.5" />, 'First Name', personalForm.first_name, isEditingPersonal, 'first_name', personalForm, setPersonalForm)}
                    {renderField(<User className="w-3.5 h-3.5" />, 'Last Name', personalForm.last_name, isEditingPersonal, 'last_name', personalForm, setPersonalForm)}
                    {renderField(<CalendarIcon className="w-3.5 h-3.5" />, 'Date of Birth', personalForm.dob, isEditingPersonal, 'dob', personalForm, setPersonalForm, 'date')}
                    {renderField(<User className="w-3.5 h-3.5" />, 'Gender', personalForm.gender, isEditingPersonal, 'gender', personalForm, setPersonalForm)}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Contact Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField(<Mail className="w-3.5 h-3.5" />, 'Personal Email', personalForm.personal_email, isEditingPersonal, 'personal_email', personalForm, setPersonalForm)}
                    {renderField(<Phone className="w-3.5 h-3.5" />, 'Phone Number', personalForm.phone, isEditingPersonal, 'phone', personalForm, setPersonalForm)}
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Address Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      {renderField(<MapPin className="w-3.5 h-3.5" />, 'Address', personalForm.address, isEditingPersonal, 'address', personalForm, setPersonalForm)}
                    </div>
                    {renderStaticField(<Building2 className="w-3.5 h-3.5" />, 'City', '-')}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Emergency Contact</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderStaticField(<User className="w-3.5 h-3.5" />, 'Name & Relation', `${ec.name} ${ec.relationship ? `(${ec.relationship})` : ''}`.trim() || '-')}
                    {renderStaticField(<Phone className="w-3.5 h-3.5" />, 'Phone Number', ec.phone)}
                    {renderStaticField(<MapPin className="w-3.5 h-3.5" />, 'Address', ec.address)}
                  </div>
                </div>

              </div>
            </div>
          </TabsContent>

          <TabsContent value="professional-info" className="m-0 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-foreground" />
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
                <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-input h-9 px-4" onClick={() => setIsEditingProfessional(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="space-y-8">
                {/* Employment Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Employment Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField(<Hash className="w-3.5 h-3.5" />, 'Employee ID', professionalForm.employee_id_number, isEditingProfessional, 'employee_id_number', professionalForm, setProfessionalForm)}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground w-[180px] shrink-0"><Building2 className="w-3.5 h-3.5" /><span>Department</span></div>
                      {isEditingProfessional ? (
                        <Select value={professionalForm.department} onValueChange={v => setProfessionalForm(p => ({ ...p, department: v as string, division: '', designation: '' }))}>
                          <SelectTrigger className="h-9 bg-transparent border-border flex-1"><SelectValue placeholder="Select Department" /></SelectTrigger>
                          <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-sm font-medium break-all">{professionalForm.department || '-'}</span>}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground w-[180px] shrink-0"><Building2 className="w-3.5 h-3.5" /><span>Division</span></div>
                      {isEditingProfessional ? (
                        <Select value={professionalForm.division} onValueChange={v => setProfessionalForm(p => ({ ...p, division: v as string, designation: '' }))} disabled={!professionalForm.department}>
                          <SelectTrigger className="h-9 bg-transparent border-border flex-1"><SelectValue placeholder="Select Division" /></SelectTrigger>
                          <SelectContent>{professionalForm.department && DIVISIONS[professionalForm.department]?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-sm font-medium break-all">{professionalForm.division || '-'}</span>}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground w-[180px] shrink-0"><Briefcase className="w-3.5 h-3.5" /><span>Designation</span></div>
                      {isEditingProfessional ? (
                        <Select value={professionalForm.designation} onValueChange={v => setProfessionalForm(p => ({ ...p, designation: v as string }))} disabled={!professionalForm.division}>
                          <SelectTrigger className="h-9 bg-transparent border-border flex-1"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                          <SelectContent>{professionalForm.division && DESIGNATIONS[professionalForm.division]?.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <span className="text-sm font-medium break-all">{professionalForm.designation || '-'}</span>}
                    </div>
                    {renderField(<Briefcase className="w-3.5 h-3.5" />, 'Employment Type', professionalForm.employment_type, isEditingProfessional, 'employment_type', professionalForm, setProfessionalForm)}
                    {renderField(<CalendarIcon className="w-3.5 h-3.5" />, 'Date of Joining', professionalForm.joining_date, isEditingProfessional, 'joining_date', professionalForm, setProfessionalForm, 'date')}
                    {renderField(<User className="w-3.5 h-3.5" />, 'Reporting Manager', professionalForm.reporting_manager, isEditingProfessional, 'reporting_manager', professionalForm, setProfessionalForm)}
                  </div>
                </div>

                {/* Work Contact */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Work Contact</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField(<Mail className="w-3.5 h-3.5" />, 'Work Email', professionalForm.email, isEditingProfessional, 'email', professionalForm, setProfessionalForm)}
                    {renderStaticField(<MapPin className="w-3.5 h-3.5" />, 'Work Location', 'Satara (Office)')}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="m-0 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Uploaded Documents</h3>
                  <p className="text-xs text-muted-foreground">Files and documents related to the employee.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-input"><Plus className="w-4 h-4 mr-2" /> Upload</Button>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              {(!employee.documents || employee.documents.length === 0) ? (
                <div className="text-muted-foreground text-sm text-center py-12 border border-dashed border-border rounded-xl bg-background/50">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-foreground">No documents uploaded yet</p>
                  <p className="mt-1 text-xs">Documents added during onboarding or later will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employee.documents.map((doc: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-border rounded-xl bg-background/50 hover:bg-background transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-input flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium truncate" title={doc.name || (typeof doc === 'string' ? doc : 'Document')}>
                            {doc.name || (typeof doc === 'string' ? doc : 'Document')}
                          </div>
                          {doc.size && <div className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</div>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => window.open(doc.url || '#', '_blank')}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="onboarding" className="m-0 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Onboarding Status</h3>
                <p className="text-xs text-muted-foreground">Progress and important dates.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center">
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

              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="font-semibold mb-6 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Important Dates
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
                    <div className="text-sm text-muted-foreground">Date of Joining</div>
                    <div className="text-sm font-medium">{formattedJoined}</div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
                    <div className="text-sm text-muted-foreground">Probation End Date</div>
                    <div className="text-sm font-medium">31 Mar 2027</div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
                    <div className="text-sm text-muted-foreground">Work Anniversary</div>
                    <div className="text-sm font-medium">01 Oct 2027</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="salary-and-hike" className="m-0">
            <SalaryAndHikeTab employee={employee} />
          </TabsContent>
          
          <TabsContent value="attendance" className="m-0">
             <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">Attendance module pending</div>
          </TabsContent>
          
          <TabsContent value="leave-and-time-off" className="m-0">
             <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">Leave & Time Off module pending</div>
          </TabsContent>
          
          <TabsContent value="performance" className="m-0">
             <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">Performance module pending</div>
          </TabsContent>
          
          <TabsContent value="activity" className="m-0">
             <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">Activity module pending</div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
