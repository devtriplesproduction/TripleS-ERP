'use client'

import React, { useState, useEffect, useRef } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  User, Loader2, Camera, FileText, Trash2, CalendarIcon, CheckCircle2, Circle, Eye,
  Save, X, MapPin, Phone, Mail, Lock, Copy
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useToast } from "@/hooks/use-toast"
import { onboardSchema, type OnboardFormData } from "@/lib/validations/onboard"
import { DEPARTMENTS, DIVISIONS, DESIGNATIONS, ROLES, HOD_STATUS } from "@/config/roles"
import Image from "next/image"
import { onboardEmployeeAction, uploadEmployeeFileAction } from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { PDFDocument } from "pdf-lib"

const formatExperience = (type?: string, years?: string | number, months?: string | number) => {
  if (type === 'Fresher' || !type) return 'Fresher';
  const y = parseInt(String(years)) || 0;
  const m = parseInt(String(months)) || 0;
  if (y === 0 && m === 0) return 'Fresher';
  const parts = [];
  if (y > 0) parts.push(`${y} Year${y > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} Month${m > 1 ? 's' : ''}`);
  return parts.join(' ');
}

const DB_NAME = 'triples-erp-draft-db'
const STORE_NAME = 'onboarding-draft-files'

const saveFilesToIDB = (avatarDataURL: string, avatarFile: File | null, files: any[]) => {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = (e: any) => {
      const db = e.target.result
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      const fileData = files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.file?.type,
        file: f.file
      }))

      store.put({ avatarDataURL, avatarFile, fileData }, 'draft-data')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
}

const loadFilesFromIDB = () => {
  return new Promise<any>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = (e: any) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) return resolve(null)
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get('draft-data')
      getReq.onsuccess = () => resolve(getReq.result)
      getReq.onerror = () => reject(getReq.error)
    }
    request.onerror = () => reject(request.error)
  })
}

const clearFilesFromIDB = () => {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onsuccess = (e: any) => {
      const db = e.target.result
      if (db.objectStoreNames.contains(STORE_NAME)) {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete('draft-data')
        tx.oncomplete = () => resolve()
      } else {
        resolve()
      }
    }
  })
}

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

// Constants imported from @/config/roles

const STEPS = [
  { id: 1, title: 'Personal', subtitle: 'Basic information' },
  { id: 2, title: 'Professional', subtitle: 'Job details' },
  { id: 3, title: 'Documents', subtitle: 'Upload documents' },
  { id: 4, title: 'Review', subtitle: 'Review & create' }
]

export function OnboardWizard({ onSuccess, onClose }: OnboardFormProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [generatedCredentials, setGeneratedCredentials] = useState<{ employee_id: string; temp_password: string; work_email: string } | null>(null)

  const [selectedAvatar, setSelectedAvatar] = useState<string>("")
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const { toast } = useToast()

  const {
    register, handleSubmit, setValue, trigger, control, getValues, reset
  } = useForm<OnboardFormData>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      first_name: "", last_name: "", dob: "", phone_number: "+91 ", personal_email: "", address: "",
      emergency_name: "", emergency_relationship: "", emergency_phone: "",
      department: "", division: "", designation: "", employment_type: "Full Time", employment_status: "Active", reporting_manager: "",
      role: "Employee", is_hod: false,
      salary: undefined, basic_salary: undefined, stipend: undefined, experience_type: "Fresher", experience_years: "0", experience_months: "0", joining_date: new Date().toISOString().split('T')[0],
      email: "", employee_id_number: "", password: "", confirm_password: ""
    }
  })

  const draftLoaded = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    if (!draftLoaded.current) {
      const savedDraft = localStorage.getItem('onboarding_draft')
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          reset(parsed)

          // Load files from IDB
          loadFilesFromIDB().then((res) => {
            if (res) {
              if (res.avatarDataURL) setSelectedAvatar(res.avatarDataURL)
              if (res.avatarFile) setSelectedAvatarFile(res.avatarFile)
              if (res.fileData && res.fileData.length > 0) {
                setUploadedFiles(res.fileData.map((f: any) => ({
                  id: f.id,
                  name: f.name,
                  label: f.name,
                  size: f.size,
                  uploaded_at: new Date().toISOString(),
                  url: '',
                  file: f.file
                })))
              }
            }
          })

          toast({ title: "Draft Loaded", description: "Your unsaved progress and files have been restored." })
        } catch {
          // Ignore error
        }
      }
      draftLoaded.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveAsDraft = async () => {
    const data = getValues()
    localStorage.setItem('onboarding_draft', JSON.stringify(data))
    try {
      await saveFilesToIDB(selectedAvatar, selectedAvatarFile, uploadedFiles)
      toast({ title: "Draft Saved", description: "Your progress and files have been saved locally." })
    } catch (e) {
      console.error(e)
      toast({ title: "Draft Saved Partially", description: "Progress saved, but files could not be cached locally.", variant: "destructive" })
    }
  }

  const firstName = useWatch({ control, name: "first_name" })
  const lastName = useWatch({ control, name: "last_name" })
  const watchedDepartment = useWatch({ control, name: "department" })
  const watchedDivision = useWatch({ control, name: "division" })
  const watchedEmployeeId = useWatch({ control, name: "employee_id_number" })
  const watchedEmail = useWatch({ control, name: "email" })
  const watchedPassword = useWatch({ control, name: "password" })
  const watchedEmploymentType = useWatch({ control, name: "employment_type" })
  const watchedEmploymentStatus = useWatch({ control, name: "employment_status" })
  const watchedJoiningDate = useWatch({ control, name: "joining_date" })
  const watchedProbationEndDate = useWatch({ control, name: "probation_end_date" })
  const watchedExperienceType = useWatch({ control, name: "experience_type" })

  useEffect(() => {
    if (firstName && lastName) {
      const email = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}@tsp.com`
      setValue("email", email, { shouldValidate: true })
    }
  }, [firstName, lastName, setValue])

  // Employee ID and password are now auto-generated server-side
  // No need for client-side generation

  useEffect(() => {
    if (watchedEmploymentType !== 'Full Time' && watchedEmploymentStatus === 'Probation') {
      setValue('employment_status', 'Active', { shouldValidate: true })
      toast({ title: 'Status Reset', description: 'Probation is only available for Full Time employees.', variant: 'destructive' })
    }

    if (watchedEmploymentStatus === 'Probation') {
      setValue('probation_period', '3 Months', { shouldValidate: true })
      if (watchedJoiningDate) {
        setValue('probation_start_date', watchedJoiningDate, { shouldValidate: true })
        const end = new Date(watchedJoiningDate)
        end.setMonth(end.getMonth() + 3)
        setValue('probation_end_date', end.toISOString().split('T')[0], { shouldValidate: true })
      }
    } else {
      setValue('probation_period', '')
      setValue('probation_start_date', '')
      setValue('probation_end_date', '')
    }
  }, [watchedEmploymentType, watchedEmploymentStatus, watchedJoiningDate, setValue, toast])

  const nextStep = async () => {
    let fields: (keyof OnboardFormData)[] = []
    if (step === 1) {
      fields = ["first_name", "last_name", "dob", "gender", "phone_number", "personal_email", "address", "city", "pincode", "emergency_name", "emergency_relationship", "emergency_phone"]
    }
    else if (step === 2) fields = ["department", "division", "designation", "employment_type", "employment_status", "salary", "basic_salary", "stipend", "experience_type", "experience_years", "experience_months", "joining_date", "role", "is_hod"]
    else if (step === 3) { setStep(4); return }

    const isValid = await trigger(fields)
    if (isValid) setStep(step + 1)
    else {
      const vals = getValues()
      if (step === 1 && !/^\+91 ?\d{10}$/.test(vals.phone_number || "")) {
        toast({ title: "Validation Error", description: "Phone number must 10 digit", variant: "destructive" })
      } else {
        toast({ title: "Validation Error", description: "Please fill required fields", variant: "destructive" })
      }
    }
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
      if (result.success && result.data) {
        localStorage.removeItem('onboarding_draft')
        await clearFilesFromIDB()

        // Show generated credentials
        setGeneratedCredentials({
          employee_id: result.data.employee_id,
          temp_password: result.data.temp_password,
          work_email: result.data.work_email,
        })

        toast({ title: "Employee Created Successfully", description: `Employee ${result.data.employee_id} has been onboarded.` })
        if (onSuccess) onSuccess()
      } else {
        toast({ title: "Error", description: result.error as string, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Transaction Failure", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const generatePdf = async () => {
    const element = document.getElementById('review-section')
    if (!element) return
    setIsGeneratingPdf(true)
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.text("Employee Onboarding Report", 14, 20)

      let y = 30
      const checkPageBreak = (needed = 10) => {
        if (y + needed > 280) {
          pdf.addPage()
          y = 20
        }
      }

      const addSection = (title: string, data: [string, any][]) => {
        checkPageBreak(15)
        pdf.setFontSize(12)
        pdf.setFont("helvetica", "bold")
        pdf.text(title, 14, y)
        y += 8

        pdf.setFontSize(10)
        pdf.setFont("helvetica", "normal")
        data.forEach(([label, value]) => {
          checkPageBreak(6)
          pdf.setFont("helvetica", "bold")
          pdf.text(`${label}:`, 14, y)
          pdf.setFont("helvetica", "normal")
          const textVal = String(value || "-")
          const lines = pdf.splitTextToSize(textVal, 130)
          pdf.text(lines, 60, y)
          y += (lines.length * 5) + 1
        })
        y += 5
      }

      const vals = getValues()

      addSection("Generated Account Information", [
        ["Employee ID", watchedEmployeeId],
        ["Work Email", watchedEmail],
        ["Password", watchedPassword]
      ])

      addSection("Personal Information", [
        ["First Name", vals.first_name],
        ["Last Name", vals.last_name],
        ["Date of Birth", vals.dob ? format(new Date(vals.dob as string), "dd MMM yyyy") : "-"],
        ["Gender", vals.gender],
        ["Phone", vals.phone_number],
        ["Personal Email", vals.personal_email],
        ["City", vals.city],
        ["Pincode", vals.pincode],
        ["Address", vals.address],
        ["Emergency Name", vals.emergency_name],
        ["Emergency Rel.", vals.emergency_relationship],
        ["Emergency Phone", vals.emergency_phone],
      ])

      addSection("Professional Information", [
        ["Department", DEPARTMENTS.find(d => d.id === vals.department)?.name || vals.department],
        ["Division", vals.division],
        ["Designation", vals.designation],
        ["Employment Type", vals.employment_type],
        ["Status", vals.employment_status],
        ["Role", vals.role],
        ...(vals.employment_type !== 'Intern' ? [
          ["HOD Status", vals.is_hod ? "True" : "False"] as [string, any],
        ] : []),
        ["Joining Date", vals.joining_date ? format(new Date(vals.joining_date as string), "dd MMM yyyy") : "-"],
        ...(vals.employment_type !== 'Intern' ? [
          ["Experience", formatExperience(vals.experience_type, vals.experience_years, vals.experience_months)] as [string, any],
        ] : []),
        ["Reporting Manager", vals.reporting_manager],
        ...(vals.employment_type === 'Intern' ? [
          ["Stipend", vals.stipend ? `Rs ${vals.stipend}` : "-"] as [string, any]
        ] : [
          ["Annual CTC", vals.salary ? `Rs ${vals.salary}` : "-"] as [string, any],
          ["Basic Salary", vals.basic_salary ? `Rs ${vals.basic_salary}` : "-"] as [string, any]
        ]),
        ...(vals.employment_status === 'Probation' ? [
          ["Probation Period", vals.probation_period] as [string, any],
          ["Probation Start", vals.probation_start_date ? format(new Date(vals.probation_start_date as string), "dd MMM yyyy") : "-"] as [string, any],
          ["Probation End", vals.probation_end_date ? format(new Date(vals.probation_end_date as string), "dd MMM yyyy") : "-"] as [string, any],
        ] : [])
      ])

      if (uploadedFiles.length > 0) {
        addSection("Uploaded Documents", uploadedFiles.map(f => [f.name, `${(f.size / 1024).toFixed(1)} KB`]))
      }

      const basePdfBytes = pdf.output('arraybuffer')
      const mergedPdf = await PDFDocument.load(basePdfBytes)

      for (const f of uploadedFiles) {
        if (!f.file) continue

        if (f.file.type === 'application/pdf') {
          try {
            const fileBuffer = await f.file.arrayBuffer()
            const uploadedPdf = await PDFDocument.load(fileBuffer)
            const copiedPages = await mergedPdf.copyPages(uploadedPdf, uploadedPdf.getPageIndices())
            copiedPages.forEach((page) => mergedPdf.addPage(page))
          } catch (e) {
            console.error('Failed to merge PDF:', e)
            toast({ title: "PDF Merge Error", description: `Could not embed ${f.name}`, variant: "destructive" })
          }
        } else if (f.file.type.startsWith('image/')) {
          try {
            const imageBuffer = await f.file.arrayBuffer()
            let image
            if (f.file.type === 'image/jpeg' || f.file.type === 'image/jpg') {
              image = await mergedPdf.embedJpg(imageBuffer)
            } else if (f.file.type === 'image/png') {
              image = await mergedPdf.embedPng(imageBuffer)
            }

            if (image) {
              const page = mergedPdf.addPage()
              const { width, height } = page.getSize()
              const imgDims = image.scaleToFit(width - 40, height - 40)
              page.drawImage(image, {
                x: 20,
                y: height - imgDims.height - 20,
                width: imgDims.width,
                height: imgDims.height,
              })
            }
          } catch (e) {
            console.error('Failed to embed image:', e)
            toast({ title: "Image Merge Error", description: `Could not embed ${f.name}`, variant: "destructive" })
          }
        }
      }

      const mergedPdfBytes = await mergedPdf.save()
      const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Employee_Onboarding_${watchedEmployeeId || 'Report'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast({ title: "PDF Error", description: "Failed to generate PDF.", variant: "destructive" })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">

      {/* Top Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Create Employee Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Add a new employee to the organization.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={saveAsDraft} className="bg-foreground text-background hover:bg-foreground/90 h-8 text-xs">
            <Save className="w-4 h-4 mr-2" /> Save as Draft
          </Button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between shrink-0 mt-2">
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
                <p className={cn("text-sm font-bold", step >= s.id ? "text-foreground" : "text-muted-foreground")}>{s.title}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-4 lg:mx-8 h-[1px] bg-border min-w-[20px]"></div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col mt-3 overflow-hidden">
        {/* Left Column - Form */}
        <div className="flex-1 min-h-0 w-full flex flex-col">

          {/* Form Container */}
          <div className="bg-card border border-border rounded-xl p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-5 mb-4">

                {/* Step 1: Personal */}
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      {/* Section Header */}
                      <div className="flex items-center gap-2 mb-6">
                        <User className="w-4 h-4 text-foreground" />
                        <h3 className="text-base font-bold text-foreground">Personal Information</h3>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Photo Upload */}
                        <div className="flex-shrink-0">
                          <input type="file" id="photo" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          <div
                            onClick={() => document.getElementById("photo")?.click()}
                            className="w-32 h-32 rounded-xl border border-dashed border-border bg-transparent flex flex-col items-center justify-center cursor-pointer hover:border-foreground transition-colors overflow-hidden group"
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
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">First Name <span className="text-destructive">*</span></label>
                            <Input {...register("first_name")} placeholder="Enter first name" />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Last Name <span className="text-destructive">*</span></label>
                            <Input {...register("last_name")} placeholder="Enter last name" />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Date of Birth <span className="text-destructive">*</span></label>
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
                            <label className="text-xs font-bold text-foreground">Gender <span className="text-destructive">*</span></label>
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
                            <label className="text-xs font-bold text-foreground">Personal Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="email" {...register("personal_email")} placeholder="example@company.com" className="pl-9" />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground">Phone Number <span className="text-destructive">*</span></label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input {...register("phone_number")} placeholder="+91 9876543210" className="pl-9" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-4 h-4 text-foreground" />
                        <h3 className="text-base font-bold text-foreground">Address Information</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-bold text-foreground">Address Line 1</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input {...register("address")} placeholder="Flat No, 302, Sunshine Apartment" className="pl-9" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">City</label>
                          <Input {...register("city")} placeholder="Pune" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">PIN Code</label>
                          <Input {...register("pincode")} placeholder="411057" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <Phone className="w-4 h-4 text-foreground" />
                        <h3 className="text-base font-bold text-foreground">Emergency Contact</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">Contact Name</label>
                          <Input {...register("emergency_name")} placeholder="Enter contact name" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">Relation</label>
                          <Input {...register("emergency_relationship")} placeholder="e.g. Father, Spouse" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">Phone Number</label>
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
                        <h3 className="text-base font-bold text-foreground">Professional Information</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Department <span className="text-destructive">*</span></label>
                        <Controller name="department" control={control} render={({ field }) => (
                          <Select onValueChange={(v) => { field.onChange(v); setValue("division", ""); setValue("designation", ""); }} value={field.value}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Department" /></SelectTrigger>
                            <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Division / Team <span className="text-destructive">*</span></label>
                        <Controller name="division" control={control} render={({ field }) => (
                          <Select onValueChange={(v) => { field.onChange(v); setValue("designation", ""); }} value={field.value} disabled={!watchedDepartment}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Division" /></SelectTrigger>
                            <SelectContent className="max-h-40">
                              {watchedDepartment && DIVISIONS[watchedDepartment]?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Designation <span className="text-destructive">*</span></label>
                        <Controller name="designation" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value} disabled={!watchedDivision}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                            <SelectContent className="max-h-40">
                              {watchedDivision && DESIGNATIONS[watchedDivision]?.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Employment Type <span className="text-destructive">*</span></label>
                        <Controller name="employment_type" control={control} render={({ field }) => (
                          <Select onValueChange={(val) => {
                            field.onChange(val);
                            if (val === 'Intern') {
                              setValue('salary', '', { shouldValidate: true });
                              setValue('basic_salary', '', { shouldValidate: true });
                              setValue('is_hod', false, { shouldValidate: true });
                              setValue('experience_type', '', { shouldValidate: true });
                              setValue('experience_years', '', { shouldValidate: true });
                              setValue('experience_months', '', { shouldValidate: true });
                            } else {
                              setValue('stipend', '', { shouldValidate: true });
                            }
                          }} value={field.value}>
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
                              <SelectItem value="Active">Active</SelectItem>
                              {watchedEmploymentType === 'Full Time' && <SelectItem value="Probation">Probation</SelectItem>}
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">Role Assignment</label>
                        <Controller name="role" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || "Employee"}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Role" /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )} />
                      </div>

                      {watchedEmploymentType !== 'Intern' && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-foreground">HOD Status</label>
                          <Controller name="is_hod" control={control} render={({ field }) => (
                            <Select onValueChange={(val) => field.onChange(val === 'True')} value={field.value ? 'True' : 'False'}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Is HOD?" /></SelectTrigger>
                              <SelectContent>
                                {HOD_STATUS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )} />
                        </div>
                      )}

                      {watchedEmploymentType !== 'Intern' && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-foreground">Experience Type <span className="text-destructive">*</span></label>
                          <Controller name="experience_type" control={control} render={({ field }) => (
                            <Select onValueChange={(val) => {
                              field.onChange(val);
                              if (val === 'Fresher') {
                                setValue('experience_years', '0', { shouldValidate: true });
                                setValue('experience_months', '0', { shouldValidate: true });
                              } else {
                                setValue('experience_years', '', { shouldValidate: true });
                                setValue('experience_months', '', { shouldValidate: true });
                              }
                            }} value={field.value}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Select Experience" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Fresher">Fresher</SelectItem>
                                <SelectItem value="Experienced">Experienced</SelectItem>
                              </SelectContent>
                            </Select>
                          )} />
                        </div>
                      )}

                      {watchedExperienceType === 'Experienced' && (
                        <div className="space-y-2 col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-md bg-muted border border-border">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">Years <span className="text-destructive">*</span></label>
                            <Input type="number" min="0" max="50" {...register("experience_years")} placeholder="e.g. 5" className="bg-background" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">Months <span className="text-destructive">*</span></label>
                            <Input type="number" min="0" max="11" {...register("experience_months")} placeholder="e.g. 2" className="bg-background" />
                          </div>
                        </div>
                      )}

                      {watchedEmploymentType === 'Intern' ? (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-foreground">Stipend (INR/Month) <span className="text-destructive">*</span></label>
                          <Input type="number" {...register("stipend")} placeholder="₹ 15000" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-foreground">Annual CTC (INR) <span className="text-destructive">*</span></label>
                          <Input type="number" {...register("salary", {
                            onChange: (e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setValue("basic_salary", Math.round(val / 12).toString(), { shouldValidate: true });
                              } else {
                                setValue("basic_salary", "", { shouldValidate: true });
                              }
                            }
                          })} placeholder="₹ 1200000" />
                        </div>
                      )}

                      {watchedEmploymentStatus === 'Probation' && (
                        <div className="space-y-2 col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-md bg-muted border border-border">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">Probation Period</label>
                            <Input value="3 Months" disabled className="bg-background opacity-70" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground">Probation End Date</label>
                            <Input value={watchedProbationEndDate ? format(new Date(watchedProbationEndDate as string), "dd MMM yyyy") : ""} disabled className="bg-background opacity-70" />
                          </div>
                        </div>
                      )}

                      <input type="hidden" {...register("basic_salary")} />
                    </div>
                  </div>
                )}

                {/* Step 3: Documents */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div onClick={() => document.getElementById('docs')?.click()} className="border border-dashed border-border hover:border-foreground p-12 flex flex-col items-center justify-center cursor-pointer rounded-xl bg-input transition-colors group">
                      <input type="file" id="docs" multiple className="hidden" onChange={handleFileUpload} />
                      <div className="mb-2">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Click to upload documents</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PNG, JPG up to 10MB</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {uploadedFiles.map(f => (
                        <div key={f.id} className="p-3 border border-border rounded-lg flex justify-between items-center bg-card">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                              <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 ml-2" onClick={() => setUploadedFiles(prev => prev.filter(x => x.id !== f.id))}>
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                  <div id="review-section" className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar bg-background">
                    {/* Show generated credentials after successful creation */}
                    {generatedCredentials ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl max-w-md mx-auto my-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-foreground/20 via-foreground to-foreground/20"></div>
                        <div className="w-14 h-14 bg-foreground rounded-full flex items-center justify-center mb-6 shadow-lg">
                          <User className="w-7 h-7 text-background" />
                        </div>
                        <h2 className="text-2xl font-black text-foreground mb-1 tracking-tight">TripleS ERP</h2>
                        <p className="text-sm text-muted-foreground mb-8">Employee account created successfully</p>
                        
                        <div className="w-full space-y-5 text-left">
                          <div className="space-y-1.5">
                            <label className="text-sm font-bold text-foreground">Work Email</label>
                            <div className="relative group">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              <Input readOnly value={generatedCredentials.work_email} className="pl-9 bg-muted/30 font-medium h-11 border-border/60 hover:border-border transition-colors cursor-default focus-visible:ring-0" />
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-sm font-bold text-foreground">Password</label>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              <Input readOnly value={generatedCredentials.temp_password} className="pl-9 pr-10 bg-muted/30 font-mono h-11 border-border/60 hover:border-border transition-colors cursor-default focus-visible:ring-0" type="text" />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 rounded-md hover:bg-muted" onClick={() => {
                                navigator.clipboard.writeText(generatedCredentials.temp_password);
                                toast({ title: "Password Copied", description: "Temporary password copied to clipboard." });
                              }}>
                                <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-sm font-bold text-foreground">Employee ID</label>
                            <div className="relative group">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                              <Input readOnly value={generatedCredentials.employee_id} className="pl-9 bg-muted/30 font-mono h-11 border-border/60 hover:border-border transition-colors cursor-default focus-visible:ring-0" />
                            </div>
                          </div>
                          
                          <Button type="button" onClick={() => {
                            navigator.clipboard.writeText(`Email: ${generatedCredentials.work_email}\nPassword: ${generatedCredentials.temp_password}\nEmployee ID: ${generatedCredentials.employee_id}`);
                            toast({ title: "Credentials Copied!", description: "All login details copied to clipboard." });
                          }} className="w-full mt-8 bg-foreground text-background hover:bg-foreground/90 font-bold h-11 text-sm shadow-md transition-all active:scale-[0.98]">
                            <Copy className="w-4 h-4 mr-2" /> Copy Login Details
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-3 border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-5 h-5 text-foreground" />
                          <h4 className="text-lg font-bold text-foreground">Account Information</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">Employee ID and password will be auto-generated upon creation.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Employee ID</label><div className="text-sm font-medium text-muted-foreground">Auto-generated</div></div>
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Work Email</label><div className="text-sm font-medium truncate" title={watchedEmail}>{watchedEmail}</div></div>
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Password</label><div className="text-sm font-medium text-muted-foreground">Auto-generated</div></div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2 pt-2">
                        <h3 className="text-lg font-bold text-foreground">Personal Information</h3>
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-7 text-xs">Edit</Button>
                      </div>

                      {selectedAvatar && (
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full border border-border overflow-hidden">
                            <Image src={selectedAvatar} alt="Avatar Preview" width={64} height={64} className="w-full h-full object-cover" />
                          </div>
                          <div className="text-sm font-medium">Profile Photo Uploaded</div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">First Name</label><div className="text-sm font-medium">{getValues("first_name")}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Last Name</label><div className="text-sm font-medium">{getValues("last_name")}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Date of Birth</label><div className="text-sm font-medium">{getValues("dob") ? format(new Date(getValues("dob") as string), "dd MMM yyyy") : "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Gender</label><div className="text-sm font-medium capitalize">{getValues("gender") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Phone</label><div className="text-sm font-medium">{getValues("phone_number") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Personal Email</label><div className="text-sm font-medium">{getValues("personal_email") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">City</label><div className="text-sm font-medium">{getValues("city") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Pincode</label><div className="text-sm font-medium">{getValues("pincode") || "-"}</div></div>
                        <div className="space-y-1 col-span-2 sm:col-span-4"><label className="text-xs uppercase font-bold text-muted-foreground">Address</label><div className="text-sm font-medium">{getValues("address") || "-"}</div></div>
                      </div>

                      <div className="mt-4 bg-muted/30 p-3 rounded-lg border border-border">
                        <h4 className="text-sm font-bold mb-3">Emergency Contact</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Name</label><div className="text-sm font-medium">{getValues("emergency_name") || "-"}</div></div>
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Relationship</label><div className="text-sm font-medium">{getValues("emergency_relationship") || "-"}</div></div>
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Phone</label><div className="text-sm font-medium">{getValues("emergency_phone") || "-"}</div></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2 pt-2">
                        <h3 className="text-lg font-bold text-foreground">Professional Information</h3>
                        <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="h-7 text-xs">Edit</Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Department</label><div className="text-sm font-medium">{DEPARTMENTS.find(d => d.id === getValues("department"))?.name || getValues("department")}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Division</label><div className="text-sm font-medium">{getValues("division") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Designation</label><div className="text-sm font-medium">{getValues("designation") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Employment Type</label><div className="text-sm font-medium">{getValues("employment_type") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Status</label><div className="text-sm font-medium">{getValues("employment_status") || "-"}</div></div>
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Role</label><div className="text-sm font-medium">{getValues("role") || "-"}</div></div>
                        {getValues("employment_type") !== 'Intern' && (
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">HOD Status</label><div className="text-sm font-medium">{getValues("is_hod") ? "True" : "False"}</div></div>
                        )}
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Joining Date</label><div className="text-sm font-medium">{getValues("joining_date") ? format(new Date(getValues("joining_date") as string), "dd MMM yyyy") : "-"}</div></div>
                        {getValues("employment_type") !== 'Intern' && (
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Experience</label><div className="text-sm font-medium">{formatExperience(getValues("experience_type"), getValues("experience_years"), getValues("experience_months"))}</div></div>
                        )}
                        <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Reporting Manager</label><div className="text-sm font-medium">{getValues("reporting_manager") || "-"}</div></div>
                        {getValues("employment_type") === 'Intern' ? (
                          <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Stipend</label><div className="text-sm font-medium">₹ {getValues("stipend")?.toLocaleString() || "-"}</div></div>
                        ) : (
                          <>
                            <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Annual CTC</label><div className="text-sm font-medium">₹ {getValues("salary")?.toLocaleString() || "-"}</div></div>
                            <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Basic Salary</label><div className="text-sm font-medium">₹ {getValues("basic_salary")?.toLocaleString() || "-"}</div></div>
                          </>
                        )}
                        {getValues('employment_status') === 'Probation' && (
                          <>
                            <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Probation Period</label><div className="text-sm font-medium">{getValues("probation_period")}</div></div>
                            <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Probation Start</label><div className="text-sm font-medium">{getValues("probation_start_date") ? format(new Date(getValues("probation_start_date") as string), "dd MMM yyyy") : "-"}</div></div>
                            <div className="space-y-1"><label className="text-xs uppercase font-bold text-muted-foreground">Probation End</label><div className="text-sm font-medium">{getValues("probation_end_date") ? format(new Date(getValues("probation_end_date") as string), "dd MMM yyyy") : "-"}</div></div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2 pt-2">
                        <h3 className="text-lg font-bold text-foreground">Documents ({uploadedFiles.length})</h3>
                        <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="h-7 text-xs">Edit</Button>
                      </div>
                      {uploadedFiles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {uploadedFiles.map(f => (
                            <div key={f.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex flex-col">
                                  <span className="text-sm font-medium truncate text-foreground">{f.name}</span>
                                  <span className="text-xs text-muted-foreground uppercase">{f.file?.type.split('/')[1] || 'Document'} • {(f.size / 1024).toFixed(1)} KB • Ready</span>
                                </div>
                              </div>
                              {f.file && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="shrink-0 text-xs h-7 ml-2"
                                  onClick={(e) => { e.preventDefault(); window.open(URL.createObjectURL(f.file as File), '_blank'); }}
                                >
                                  View
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">No documents uploaded.</div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Navigation Buttons */}
              <div className="mt-auto flex justify-between items-center pt-3 border-t border-border shrink-0">
                <Button type="button" variant="outline" onClick={() => onClose ? onClose() : router.push('/hr/onboarding')} className="rounded-md bg-transparent border-border h-8 w-24 text-foreground text-xs">
                  &larr; {generatedCredentials ? 'Done' : 'Cancel'}
                </Button>
                <div className="flex gap-3">
                  {step > 1 && !generatedCredentials && <Button key="back-btn" type="button" variant="outline" onClick={prevStep} className="rounded-md bg-transparent border-border h-9 w-28 text-foreground text-xs">Back</Button>}
                  {step === 4 && (
                    <Button key="pdf-btn" type="button" variant="outline" onClick={generatePdf} disabled={isGeneratingPdf} className="rounded-md bg-transparent border-border h-9 text-foreground text-xs font-bold px-4 hover:bg-accent hover:text-accent-foreground">
                      {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                      Download PDF
                    </Button>
                  )}
                  {generatedCredentials ? (
                    <Button key="done-btn" type="button" onClick={() => router.push('/hr/onboarding')} className="rounded-md bg-foreground text-background hover:bg-foreground/90 h-9 w-40 font-bold text-xs">
                      Go to Onboarding
                    </Button>
                  ) : step < 4 ? (
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
      </div>
    </div>
  )
}
