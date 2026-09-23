'use client'

import React, { useState, useEffect } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  User, Loader2, Camera, FileText, Trash2, CalendarIcon, CheckCircle2, Circle, Eye,
  Save, X, MapPin, Phone, Mail, Lightbulb, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useToast } from "@/hooks/use-toast"
import { onboardSchema, type OnboardFormData } from "@/lib/validations/onboard"
import Image from "next/image"
import { onboardEmployeeAction, uploadEmployeeFileAction } from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface OnboardFormProps {
  onSuccess?: () => void
  onClose?: () => void
}

interface UploadedFile {
  id: string
  name: string
  label: string
  size: number
  uploaded_at: string
  url: string
  file?: File
  blobUrl?: string
}

const DEPARTMENTS = [
  { id: 'engineering', name: 'Engineering' },
  { id: 'hr', name: 'Human Resources' },
  { id: 'sales', name: 'Sales' },
  { id: 'marketing', name: 'Marketing' }
]

const DESIGNATIONS = {
  'engineering': [{ id: 'se', name: 'Software Engineer' }, { id: 'lead', name: 'Tech Lead' }],
  'hr': [{ id: 'recruiter', name: 'Recruiter' }, { id: 'mgr', name: 'HR Manager' }],
  'sales': [{ id: 'ae', name: 'Account Executive' }],
  'marketing': [{ id: 'manager', name: 'Marketing Manager' }]
}

const STEPS = [
  { id: 1, title: 'Personal', subtitle: 'Basic information' },
  { id: 2, title: 'Professional', subtitle: 'Job details' },
  { id: 3, title: 'Documents', subtitle: 'Upload documents' },
  { id: 4, title: 'Login', subtitle: 'Account setup' }
]

export function OnboardWizard({ onSuccess, onClose }: OnboardFormProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedAvatar, setSelectedAvatar] = useState<string>("")
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDobOpen, setIsDobOpen] = useState(false)
  const [isJoiningOpen, setIsJoiningOpen] = useState(false)

  const { toast } = useToast()

  const {
    register, handleSubmit, setValue, trigger, control, getValues, reset,
    formState: { errors }
  } = useForm<OnboardFormData>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      first_name: "", last_name: "", dob: "", phone_number: "", personal_email: "", address: "",
      emergency_name: "", emergency_relationship: "", emergency_phone: "",
      department: "", designation: "", employment_type: "full-time",
      salary: undefined, experience: undefined, joining_date: new Date().toISOString().split('T')[0],
      email: "", employee_id_number: "", password: "", confirm_password: ""
    }
  })

  useEffect(() => {
    setMounted(true)
    const savedDraft = localStorage.getItem('onboarding_draft')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        reset(parsed)
        toast({ title: "Draft Loaded", description: "Your unsaved progress has been restored." })
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveAsDraft = () => {
    const data = getValues()
    localStorage.setItem('onboarding_draft', JSON.stringify(data))
    toast({ title: "Draft Saved", description: "Your progress has been saved locally." })
  }

  const firstName = useWatch({ control, name: "first_name" })
  const lastName = useWatch({ control, name: "last_name" })
  const watchedDepartment = useWatch({ control, name: "department" })

  useEffect(() => {
    if (firstName && lastName) {
      const email = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}@tripleserp.com`
      setValue("email", email, { shouldValidate: true })
    }
  }, [firstName, lastName, setValue])

  useEffect(() => {
    if (step === 4 && !getValues('employee_id_number')) {
      setValue("employee_id_number", `EMP-${Math.floor(1000 + Math.random() * 9000)}`, { shouldValidate: true })
      setValue("password", "TempPass123!")
      setValue("confirm_password", "TempPass123!")
    }
  }, [step, setValue, getValues])

  const nextStep = async () => {
    let fields: (keyof OnboardFormData)[] = []
    if (step === 1) fields = ["first_name", "last_name", "dob", "gender", "phone_number", "personal_email", "address"]
    else if (step === 2) fields = ["department", "designation", "employment_type", "salary", "experience", "joining_date"]
    else if (step === 3) { setStep(4); return }

    const isValid = await trigger(fields)
    if (isValid) setStep(step + 1)
    else toast({ title: "Validation Error", description: "Please fill required fields", variant: "destructive" })
  }

  const prevStep = () => setStep(step - 1)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => { setSelectedAvatar(reader.result as string); setSelectedAvatarFile(file) }
      reader.readAsDataURL(file)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    Array.from(files).forEach((file: File) => {
      const fileId = `file-${Date.now()}`
      setUploadedFiles(prev => [...prev, { id: fileId, name: file.name, label: file.name, size: file.size, uploaded_at: new Date().toISOString(), url: '', file }])
      toast({ title: "Document Added", description: `${file.name} staged.` })
    })
  }

  const onSubmit = async (data: OnboardFormData) => {
    setIsSubmitting(true)
    const uploadedDocs: { id: string; name: string; path: string }[] = []
    let uploadedAvatarPath = ""

    try {
      if (selectedAvatarFile) {
        const formData = new FormData(); formData.append("file", selectedAvatarFile)
        const uploadRes = await uploadEmployeeFileAction(formData)
        if (uploadRes.success) uploadedAvatarPath = uploadRes.path as string
      }

      for (const f of uploadedFiles) {
        if (f.file) {
          const formData = new FormData(); formData.append("file", f.file)
          const uploadRes = await uploadEmployeeFileAction(formData)
          if (uploadRes.success) {
            uploadedDocs.push({ id: f.id, name: f.name, path: uploadRes.path })
          }
        }
      }

      const onboardData = {
        ...data,
        profile_photo: uploadedAvatarPath || undefined,
        documents: uploadedDocs,
      }

      const result = await onboardEmployeeAction(onboardData)
      if (result.success) {
        localStorage.removeItem('onboarding_draft')
        toast({ title: "Employee Added", description: "Employee onboarded successfully." })
        if (onSuccess) onSuccess()
        if (onClose) onClose()
        else router.push('/hr/onboarding')
      } else {
        toast({ title: "Error", description: result.error as string, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Transaction Failure", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="w-full space-y-2 pb-0">

      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Create Employee Profile</h1>
          <p className="text-[11px] text-muted-foreground mt-0">Add a new employee to the organization.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={saveAsDraft} className="bg-transparent border-border hover:bg-input text-foreground h-8 text-xs">
            <Save className="w-4 h-4 mr-2" /> Save as Draft
          </Button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-border transition-colors",
                step >= s.id
                  ? "bg-foreground text-background"
                  : "bg-transparent text-muted-foreground"
              )}>
                {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
              </div>
              <div className="hidden md:block">
                <p className={cn("text-xs font-bold", step >= s.id ? "text-foreground" : "text-muted-foreground")}>{s.title}</p>
                <p className="text-[10px] text-muted-foreground">{s.subtitle}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-4 lg:mx-8 h-[1px] bg-border min-w-[20px]"></div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-3 items-stretch mt-3">
        {/* Left Column - Form */}
        <div className="flex-1 w-full flex flex-col h-full">

          {/* Form Container */}
          <div className="bg-card border border-border rounded-xl p-3 flex-1 flex flex-col h-full">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 flex-1 flex flex-col h-full">

              {/* Step 1: Personal */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    {/* Section Header */}
                    <div className="flex items-start gap-2 mb-1">
                      <User className="w-4 h-4 text-foreground" />
                      <div>
                        <h3 className="text-xs font-bold text-foreground">Personal Information</h3>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Photo Upload */}
                      <div className="flex-shrink-0">
                        <input type="file" id="photo" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        <div
                          onClick={() => document.getElementById("photo")?.click()}
                          className="w-32 h-32 rounded-xl border border-dashed border-muted-foreground/30 bg-transparent flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors overflow-hidden group"
                        >
                          {selectedAvatar ? (
                            <Image width={160} height={160} src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-muted-foreground">
                              <Camera className="w-6 h-6 mb-3" />
                              <span className="text-sm font-bold text-foreground mb-1">Upload Photo</span>
                              <span className="text-[10px]">JPG, PNG (Max 5MB)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">First Name <span className="text-red-500">*</span></label>
                          <Input {...register("first_name")} placeholder="Enter first name" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Last Name <span className="text-red-500">*</span></label>
                          <Input {...register("last_name")} placeholder="Enter last name" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Date of Birth <span className="text-red-500">*</span></label>
                          <Controller name="dob" control={control} render={({ field }) => (
                            <Popover open={isDobOpen} onOpenChange={setIsDobOpen}>
                              <PopoverTrigger className={cn(
                                "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-input px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                                !field.value && "text-muted-foreground"
                              )}>
                                {field.value ? format(new Date(field.value), "dd/MM/yyyy") : <span>DD/MM/YYYY</span>}
                                <CalendarIcon className="h-4 w-4 text-muted-foreground opacity-70" />
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  captionLayout="dropdown"
                                  fromYear={1950}
                                  toYear={new Date().getFullYear()}
                                  selected={field.value ? new Date(field.value) : undefined} 
                                  onSelect={(date) => { field.onChange(date ? format(date, "yyyy-MM-dd") : ""); setIsDobOpen(false); }} 
                                  initialFocus 
                                />
                              </PopoverContent>
                            </Popover>
                          )} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Gender <span className="text-red-500">*</span></label>
                          <Controller name="gender" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <SelectTrigger className="w-full capitalize"><SelectValue placeholder="Select gender" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Personal Email <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" {...register("personal_email")} placeholder="example@company.com" className="pl-9" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Phone Number <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input {...register("phone_number")} placeholder="+91 98765 43210" className="pl-9" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-2 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4 text-foreground" />
                      <h3 className="text-sm font-bold text-foreground">Address Information</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      <div className="space-y-1.5 sm:col-span-1">
                        <label className="text-[11px] font-bold text-foreground">Address Line 1 <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...register("address")} placeholder="Flat No, 302, Sunshine Apartment" className="pl-9" />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:col-span-1">
                        <label className="text-[11px] font-bold text-foreground">Address Line 2</label>
                        <Input placeholder="Wakad" />
                      </div>

                      <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-1">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">City <span className="text-red-500">*</span></label>
                          <Input placeholder="Pune" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">State <span className="text-red-500">*</span></label>
                          <Input placeholder="Maharashtra" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">PIN Code <span className="text-red-500">*</span></label>
                          <Input placeholder="411057" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Country <span className="text-red-500">*</span></label>
                          <Input placeholder="India" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Professional */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 mb-3">
                    <User className="w-4 h-4 text-foreground" />
                    <div>
                      <h3 className="text-xs font-bold text-foreground">Professional Information</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Department <span className="text-red-500">*</span></label>
                      <Controller name="department" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Department" /></SelectTrigger>
                          <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Designation <span className="text-red-500">*</span></label>
                      <Controller name="designation" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchedDepartment}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                          <SelectContent>
                            {watchedDepartment && (DESIGNATIONS as Record<string, { id: string; name: string }[]>)[watchedDepartment]?.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Employment Type <span className="text-red-500">*</span></label>
                      <Controller name="employment_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Full Time</SelectItem>
                            <SelectItem value="part-time">Part Time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Joining Date <span className="text-red-500">*</span></label>
                      <Controller name="joining_date" control={control} render={({ field }) => (
                        <Popover open={isJoiningOpen} onOpenChange={setIsJoiningOpen}>
                          <PopoverTrigger className={cn("flex h-10 w-full items-center justify-start rounded-md border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {field.value ? format(new Date(field.value), "dd/MM/yyyy") : <span>Pick a date</span>}
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => { field.onChange(date ? format(date, "yyyy-MM-dd") : ""); setIsJoiningOpen(false); }} initialFocus />
                          </PopoverContent>
                        </Popover>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Salary (Annual) <span className="text-red-500">*</span></label>
                      <Input type="number" {...register("salary")} placeholder="₹ 1200000" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Documents */}
              {step === 3 && (
                <div className="space-y-6">
                  <div onClick={() => document.getElementById('docs')?.click()} className="border border-dashed border-border p-12 flex flex-col items-center justify-center cursor-pointer rounded-xl bg-input hover:bg-muted transition-colors group">
                    <input type="file" id="docs" multiple className="hidden" onChange={handleFileUpload} />
                    <div className="mb-2">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Click to upload documents</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PNG, JPG up to 10MB</p>
                  </div>
                  {uploadedFiles.map(f => (
                    <div key={f.id} className="p-3 border border-border rounded-lg flex justify-between items-center bg-card">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-xs font-medium text-foreground">Employee ID</label><Input readOnly {...register("employee_id_number")} /></div>
                    <div className="space-y-2"><label className="text-xs font-medium text-foreground">Work Email</label><Input readOnly {...register("email")} /></div>
                  </div>
                  <p className="text-sm text-muted-foreground">Review the details on the right panel before creating the profile.</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-auto flex justify-between items-center pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => onClose ? onClose() : router.push('/hr/onboarding')} className="rounded-md bg-transparent border-border h-8 w-24 text-foreground text-xs">
                  &larr; Cancel
                </Button>
                <div className="flex gap-3">
                  {step > 1 && <Button type="button" variant="outline" onClick={prevStep} className="rounded-md bg-transparent border-border h-9 w-28 text-foreground text-xs">Back</Button>}
                  {step < 4 ? (
                    <Button type="button" onClick={nextStep} className="rounded-md bg-foreground text-background hover:bg-foreground/90 h-9 w-28 font-bold text-xs">Next &rarr;</Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} className="rounded-md bg-foreground text-background hover:bg-foreground/90 h-9 w-40 font-bold text-xs">
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Profile'}
                    </Button>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>

        {/* Right Column - Preview Panel */}
        <div className="w-full xl:w-[320px] shrink-0 flex flex-col">

          {/* Onboarding Progress Card */}
          <div className="bg-card border border-border rounded-xl p-4 flex-1 flex flex-col">
            <h4 className="text-sm font-bold text-foreground mb-4">Onboarding Progress</h4>

            <div className="flex flex-col items-center justify-center mb-5 flex-shrink-0">
              {/* Simple visual progress circle */}
              <div className="w-24 h-24 flex items-center justify-center relative">
                {/* Highlight portion based on step */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                  {/* Background track */}
                  <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-input" />
                  {/* Active progress */}
                  <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-foreground transition-all duration-500 ease-in-out" strokeDasharray={`${(step / 4) * 364.4} 364.4`} strokeLinecap="round" />
                </svg>
                <span className="text-xl font-bold text-foreground relative z-10">{step * 25}%</span>
              </div>
              <p className="text-xs font-medium text-foreground mt-4">Step {step} of 4</p>
              <p className="text-xs text-muted-foreground text-center mt-1 px-4">
                {step === 1 ? 'Complete your personal information to continue.' :
                  step === 2 ? 'Provide job-related information.' :
                    step === 3 ? 'Upload necessary documents.' : 'Review account setup details.'}
              </p>
            </div>

            <div className="space-y-1 mt-auto">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-start gap-3 py-2 px-3 rounded-lg transition-colors",
                    step === s.id ? "bg-muted/50" : ""
                  )}
                >
                  <div className="mt-0.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                      step > s.id ? "bg-foreground border-foreground text-background" :
                        step === s.id ? "bg-foreground border-foreground text-background" :
                          "bg-transparent border-border text-foreground"
                    )}>
                      {s.id}
                    </div>
                  </div>
                  <div className="flex-1 flex justify-between items-start">
                    <div>
                      <p className={cn("text-sm font-bold", step >= s.id ? "text-foreground" : "text-muted-foreground")}>{s.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.subtitle}</p>
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      {step > s.id ? 'Done' : step === s.id ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}
