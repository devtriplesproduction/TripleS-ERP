'use client'

import React, { useState, useEffect } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  User, Loader2, Camera, FileText, Trash2, CalendarIcon, CheckCircle2, Circle, Eye,
  Save, X, MapPin, Phone, Mail
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useToast } from "@/hooks/use-toast"
import { onboardSchema, type OnboardFormData } from "@/lib/validations/onboard"
import Image from "next/image"
import { onboardEmployeeAction, uploadEmployeeFileAction } from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"
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
  { id: 'HR', name: 'HR' },
  { id: 'Development', name: 'Development' },
  { id: 'Finance', name: 'Finance' },
  { id: 'Graphic Design / Content Creation', name: 'Graphic Design / Content Creation' },
  { id: 'Sales', name: 'Sales' }
]

const DESIGNATIONS = {
  'HR': [
    { id: 'hr-manager', name: 'HR Manager' },
    { id: 'hr-executive', name: 'HR Executive' },
    { id: 'hr-generalist', name: 'HR Generalist' },
    { id: 'hr-recruiter', name: 'HR Recruiter' },
    { id: 'talent-acquisition-specialist', name: 'Talent Acquisition Specialist' },
    { id: 'hr-coordinator', name: 'HR Coordinator' }
  ],
  'Development': [
    { id: 'head-of-engineering', name: 'Head of Engineering' },
    { id: 'engineering-manager', name: 'Engineering Manager' },
    { id: 'technical-lead', name: 'Technical Lead' },
    { id: 'senior-software-developer', name: 'Senior Software Developer' },
    { id: 'software-developer', name: 'Software Developer' },
    { id: 'junior-software-developer', name: 'Junior Software Developer' },
    { id: 'frontend-developer', name: 'Frontend Developer' },
    { id: 'backend-developer', name: 'Backend Developer' },
    { id: 'full-stack-developer', name: 'Full Stack Developer' },
    { id: 'qa-engineer', name: 'QA Engineer' },
    { id: 'devops-engineer', name: 'DevOps Engineer' },
    { id: 'software-developer-intern', name: 'Software Developer Intern' }
  ],
  'Finance': [
    { id: 'finance-manager', name: 'Finance Manager' },
    { id: 'accounts-manager', name: 'Accounts Manager' },
    { id: 'senior-accountant', name: 'Senior Accountant' },
    { id: 'accountant', name: 'Accountant' },
    { id: 'finance-executive', name: 'Finance Executive' },
    { id: 'accounts-executive', name: 'Accounts Executive' },
    { id: 'payroll-executive', name: 'Payroll Executive' },
    { id: 'financial-analyst', name: 'Financial Analyst' }
  ],
  'Graphic Design / Content Creation': [
    { id: 'creative-director', name: 'Creative Director' },
    { id: 'design-manager', name: 'Design Manager' },
    { id: 'senior-graphic-designer', name: 'Senior Graphic Designer' },
    { id: 'graphic-designer', name: 'Graphic Designer' },
    { id: 'ui-ux-designer', name: 'UI/UX Designer' },
    { id: 'video-editor', name: 'Video Editor' },
    { id: 'motion-graphics-designer', name: 'Motion Graphics Designer' },
    { id: 'content-writer', name: 'Content Writer' },
    { id: 'content-creator', name: 'Content Creator' },
    { id: 'social-media-executive', name: 'Social Media Executive' }
  ],
  'Sales': [
    { id: 'sales-manager', name: 'Sales Manager' },
    { id: 'sales-team-lead', name: 'Sales Team Lead' },
    { id: 'business-development-manager', name: 'Business Development Manager' },
    { id: 'senior-sales-executive', name: 'Senior Sales Executive' },
    { id: 'sales-executive', name: 'Sales Executive' },
    { id: 'business-development-executive', name: 'Business Development Executive' },
    { id: 'account-manager', name: 'Account Manager' },
    { id: 'inside-sales-executive', name: 'Inside Sales Executive' }
  ]
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

  const { toast } = useToast()

  const {
    register, handleSubmit, setValue, trigger, control, getValues, reset
  } = useForm<OnboardFormData>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      first_name: "", last_name: "", dob: "", phone_number: "", personal_email: "", address: "",
      emergency_name: "", emergency_relationship: "", emergency_phone: "",
      department: "", designation: "", employment_type: "Full Time", employment_status: "Onboarding", reporting_manager: "",
      salary: undefined, basic_salary: undefined, experience: undefined, joining_date: new Date().toISOString().split('T')[0],
      email: "", employee_id_number: "", password: "", confirm_password: ""
    }
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    const savedDraft = localStorage.getItem('onboarding_draft')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        reset(parsed)
        toast({ title: "Draft Loaded", description: "Your unsaved progress has been restored." })
      } catch {
        // Ignore error
      }
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
  const watchedEmployeeId = useWatch({ control, name: "employee_id_number" })
  const watchedEmail = useWatch({ control, name: "email" })
  const watchedPassword = useWatch({ control, name: "password" })

  useEffect(() => {
    if (firstName && lastName) {
      const email = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}@triplesproduction.com`
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
    if (step === 1) {
      if (!selectedAvatar) {
        toast({ title: "Validation Error", description: "Please upload a photo", variant: "destructive" })
        return
      }
      fields = ["first_name", "last_name", "dob", "gender", "phone_number", "personal_email", "address", "city", "pincode", "emergency_name", "emergency_relationship", "emergency_phone"]
    }
    else if (step === 2) fields = ["department", "designation", "employment_type", "employment_status", "salary", "basic_salary", "experience", "joining_date"]
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
        if (uploadRes.success) {
          uploadedAvatarPath = uploadRes.path as string
        } else {
          toast({ title: "Photo Upload Failed", description: uploadRes.error as string, variant: "destructive" })
          setIsSubmitting(false)
          return
        }
      }

      for (const f of uploadedFiles) {
        if (f.file) {
          const formData = new FormData(); formData.append("file", f.file)
          const uploadRes = await uploadEmployeeFileAction(formData)
          if (uploadRes.success && uploadRes.path) {
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
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-foreground" />
                      <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
                    </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                      {/* Photo Upload */}
                      <div className="flex-shrink-0 mt-5">
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
                              <span className="text-sm font-bold text-foreground mb-1">Upload Photo <span className="text-destructive">*</span></span>
                              <span className="text-[10px]">JPG, PNG (Max 5MB)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">First Name <span className="text-destructive">*</span></label>
                          <Input {...register("first_name")} placeholder="Enter first name" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Last Name <span className="text-destructive">*</span></label>
                          <Input {...register("last_name")} placeholder="Enter last name" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Date of Birth <span className="text-destructive">*</span></label>
                          <Controller name="dob" control={control} render={({ field }) => (
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="DD/MM/YYYY"
                              className="h-10 w-full rounded-lg px-3 py-2 text-sm"
                              endMonth={new Date()}
                            />
                          )} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Gender <span className="text-destructive">*</span></label>
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
                          <label className="text-[11px] font-bold text-foreground">Personal Email <span className="text-destructive">*</span></label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" {...register("personal_email")} placeholder="example@company.com" className="pl-9" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-foreground">Phone Number <span className="text-destructive">*</span></label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input {...register("phone_number")} placeholder="+91 98765 43210" className="pl-9" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-1 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-foreground" />
                      <h3 className="text-sm font-bold text-foreground">Address Information</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[11px] font-bold text-foreground">Address Line 1 <span className="text-destructive">*</span></label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...register("address")} placeholder="Flat No, 302, Sunshine Apartment" className="pl-9" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground">City <span className="text-destructive">*</span></label>
                        <Input {...register("city")} placeholder="Pune" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground">PIN Code <span className="text-destructive">*</span></label>
                        <Input {...register("pincode")} placeholder="411057" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-1 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-foreground" />
                      <h3 className="text-sm font-bold text-foreground">Emergency Contact</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground">Contact Name <span className="text-destructive">*</span></label>
                        <Input {...register("emergency_name")} placeholder="Enter contact name" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground">Relation <span className="text-destructive">*</span></label>
                        <Input {...register("emergency_relationship")} placeholder="e.g. Father, Spouse" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-foreground">Phone Number <span className="text-destructive">*</span></label>
                        <Input {...register("emergency_phone")} placeholder="+91 98765 43210" />
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
                      <label className="text-xs font-medium text-foreground">Department <span className="text-destructive">*</span></label>
                      <Controller name="department" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Department" /></SelectTrigger>
                          <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Designation <span className="text-destructive">*</span></label>
                      <Controller name="designation" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchedDepartment}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                          <SelectContent className="max-h-40">
                            {watchedDepartment && (DESIGNATIONS as Record<string, { id: string; name: string }[]>)[watchedDepartment]?.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Employment Type <span className="text-destructive">*</span></label>
                      <Controller name="employment_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full Time">Full Time</SelectItem>
                            <SelectItem value="Part Time">Part Time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Joining Date <span className="text-destructive">*</span></label>
                      <Controller name="joining_date" control={control} render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Pick a date"
                          className="h-10 w-full rounded-md px-3 py-2 text-sm"
                        />
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Reporting Manager</label>
                      <Input {...register("reporting_manager")} placeholder="Enter manager name" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Employment Status <span className="text-destructive">*</span></label>
                      <Controller name="employment_status" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Onboarding">Onboarding</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Probation">Probation</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Annual CTC (INR) <span className="text-destructive">*</span></label>
                      <Input type="number" {...register("salary")} placeholder="₹ 1200000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Basic Salary (INR) <span className="text-destructive">*</span></label>
                      <Input type="number" {...register("basic_salary")} placeholder="₹ 480000" />
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="bg-muted/50 rounded-lg p-2.5 space-y-2 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">Generated Account</h4>
                    </div>
                    <div className="flex items-center gap-40">
                      <div className="space-y-1 shrink-0"><label className="text-[10px] uppercase font-bold text-muted-foreground">Employee ID</label><div className="text-sm font-medium">{watchedEmployeeId}</div></div>
                      <div className="space-y-1 shrink-0"><label className="text-[10px] uppercase font-bold text-muted-foreground">Password</label><div className="text-sm font-medium">{watchedPassword}</div></div>
                      <div className="space-y-1 min-w-0 flex-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Work Email</label><div className="text-sm font-medium truncate" title={watchedEmail}>{watchedEmail}</div></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground border-b border-border pb-1">Personal Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Full Name</label><div className="text-sm font-medium">{getValues("first_name")} {getValues("last_name")}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Date of Birth</label><div className="text-sm font-medium">{getValues("dob") ? format(new Date(getValues("dob") as string), "dd MMM yyyy") : "-"}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Gender</label><div className="text-sm font-medium capitalize">{getValues("gender") || "-"}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Phone</label><div className="text-sm font-medium">{getValues("phone_number") || "-"}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Personal Email</label><div className="text-sm font-medium">{getValues("personal_email") || "-"}</div></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-foreground border-b border-border pb-1">Professional Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Department</label><div className="text-sm font-medium">{DEPARTMENTS.find(d => d.id === getValues("department"))?.name || getValues("department")}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Designation</label><div className="text-sm font-medium">{getValues("designation")}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Employment Type</label><div className="text-sm font-medium">{getValues("employment_type")}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Joining Date</label><div className="text-sm font-medium">{getValues("joining_date") ? format(new Date(getValues("joining_date") as string), "dd MMM yyyy") : "-"}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Annual CTC</label><div className="text-sm font-medium">₹ {getValues("salary") || "-"}</div></div>
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-muted-foreground">Basic Salary</label><div className="text-sm font-medium">₹ {getValues("basic_salary") || "-"}</div></div>
                    </div>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-foreground border-b border-border pb-1">Documents ({uploadedFiles.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {uploadedFiles.map(f => (
                          <div key={f.id} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-xs border border-border">
                            <FileText className="w-3 h-3 text-primary" />
                            <span className="truncate max-w-[150px]">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-auto flex justify-between items-center pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => onClose ? onClose() : router.push('/hr/onboarding')} className="rounded-md bg-transparent border-border h-8 w-24 text-foreground text-xs">
                  &larr; Cancel
                </Button>
                <div className="flex gap-3">
                  {step > 1 && <Button key="back-btn" type="button" variant="outline" onClick={prevStep} className="rounded-md bg-transparent border-border h-9 w-28 text-foreground text-xs">Back</Button>}
                  {step < 4 ? (
                    <Button key="next-btn" type="button" onClick={nextStep} className="rounded-md bg-foreground text-background hover:bg-foreground/90 h-9 w-28 font-bold text-xs">Next &rarr;</Button>
                  ) : (
                    <Button key="submit-btn" type="submit" disabled={isSubmitting} className="rounded-md bg-foreground text-background hover:bg-foreground/90 h-9 w-40 font-bold text-xs">
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
