"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, FileText, UploadCloud, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatHoursMinutes } from "@/lib/utils/time"
import { cn } from "@/lib/utils"

import { submitLeaveAction } from "@/actions/leave.actions"

export function LeaveForm({ 
  onCancel, 
  currentEmployeeId, 
  onSuccess, 
  initialStatus = "Pending HR", 
  compOffBalance = 0,
  initialRequestType = "LEAVE",
  initialLeaveType = "Sick Leave"
}: { 
  onCancel: () => void, 
  currentEmployeeId: string, 
  onSuccess: (leave: any) => void, 
  initialStatus?: string, 
  compOffBalance?: number,
  initialRequestType?: string,
  initialLeaveType?: string
}) {
  const [requestType, setRequestType] = useState(initialRequestType)
  const [leaveType, setLeaveType] = useState(initialLeaveType)
  const [duration, setDuration] = useState("Full Day")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Clear unsaved file if switching away from Sick Leave or if switching to WFH
  useEffect(() => {
    if (requestType !== 'LEAVE' || leaveType !== 'Sick Leave') {
      setFile(null)
    }
  }, [requestType, leaveType])

  const handleRequestTypeChange = (val: string | null) => {
    if (!val) return
    setRequestType(val)
    if (val !== 'LEAVE' || leaveType !== 'Sick Leave') {
      setFile(null)
    }
  }

  const handleLeaveTypeChange = (val: string | null) => {
    if (!val) return
    setLeaveType(val)
    if (val !== 'Sick Leave') {
      setFile(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    if (!selectedFile) {
      setFile(null)
      return
    }

    // 3MB limit (3 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 3 * 1024 * 1024
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 3MB limit")
      e.target.value = ""
      setFile(null)
      return
    }

    // Supported formats: PDF, JPG, PNG
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png']
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    const validMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    
    if (!validExtensions.includes(fileExt) && !validMimeTypes.includes(selectedFile.type)) {
      toast.error("Only PDF, JPG, and PNG files are supported")
      e.target.value = ""
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason) {
      toast.error("Please fill all required fields")
      return
    }
    if (!currentEmployeeId) {
      toast.error("User context missing")
      return
    }

    if (requestType === 'LEAVE' && leaveType === 'Compensatory Off') {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (duration === 'Half Day') {
        diffDays = 0.5;
      }
      
      const requiredHours = diffDays * 8;
      if (compOffBalance < requiredHours) {
        toast.error(`Insufficient Comp Off balance. Required: ${requiredHours}h (${diffDays} day${diffDays > 1 ? 's' : ''}), Available: ${formatHoursMinutes(compOffBalance)}.`);
        return;
      }
    }

    setLoading(true)
    let fileUrl = null

    // Only upload medical certificate when request is Sick Leave and a file was provided
    if (requestType === 'LEAVE' && leaveType === 'Sick Leave' && file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentEmployeeId}-${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('leave_documents')
        .upload(`leave-certificates/${fileName}`, file)
        
      if (uploadError) {
        console.error("Upload error:", uploadError)
        toast.error("Document upload failed (bucket might be missing). Proceeding without it.")
      } else {
        const { data: urlData } = supabase.storage.from('leave_documents').getPublicUrl(`leave-certificates/${fileName}`)
        fileUrl = urlData.publicUrl
      }
    }

    const newLeave = {
      employee_id: currentEmployeeId,
      request_type: requestType,
      leave_type: requestType === 'WFH' ? null : leaveType,
      start_date: startDate,
      end_date: endDate,
      is_half_day: duration === "Half Day",
      reason,
      status: initialStatus,
      medical_certificate_url: (requestType === 'LEAVE' && leaveType === 'Sick Leave') ? fileUrl : null
    }

    const res = await submitLeaveAction(newLeave)
    setLoading(false)

    if (!res.success) {
      toast.error(res.error || "Failed to submit leave application")
    } else {
      toast.success(requestType === 'WFH' ? "WFH request submitted successfully" : "Leave application submitted successfully")
      onSuccess(res.data)
    }
  }
  
  return (
    <div className="bg-card border border-border p-4 sm:p-6 rounded-xl flex flex-col gap-5 sm:gap-6 animate-in fade-in zoom-in-95 duration-200 w-full min-w-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">New Request</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Submit a leave or work from home request.</p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {/* Request Type and Leave Type in one horizontal row */}
        <div className={cn("grid gap-4 sm:gap-5", requestType === 'LEAVE' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" /> Request Type
            </label>
            <Select value={requestType} onValueChange={handleRequestTypeChange}>
              <SelectTrigger className="w-full bg-background border-border h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Select Request Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEAVE">Leave Request</SelectItem>
                <SelectItem value="WFH">Work From Home (WFH)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestType === 'LEAVE' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" /> Leave Type
              </label>
              <Select value={leaveType} onValueChange={handleLeaveTypeChange}>
                <SelectTrigger className="w-full bg-background border-border h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                  {compOffBalance >= 8 && (
                    <SelectItem value="Compensatory Off">
                      Compensatory Off ({formatHoursMinutes(compOffBalance)} • {Math.floor(compOffBalance / 8)} {Math.floor(compOffBalance / 8) === 1 ? 'day' : 'days'} available)
                    </SelectItem>
                  )}
                  <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Dynamic Duration Label Based on Request Type */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" /> {requestType === 'WFH' ? 'WFH Duration' : 'Leave Duration'}
          </label>
          <Select value={duration} onValueChange={(val) => val && setDuration(val)}>
            <SelectTrigger className="w-full bg-background border-border h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Select Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Full Day">Full Day</SelectItem>
              <SelectItem value="Half Day">Half Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" /> Start Date
            </label>
            <DatePicker 
              value={startDate}
              onChange={setStartDate}
              placeholder="Select Date" 
              iconLeft 
              showChevron 
              className="h-10 bg-background" 
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" /> End Date
            </label>
            <DatePicker 
              value={endDate}
              onChange={setEndDate}
              placeholder="Select Date" 
              iconLeft 
              showChevron 
              className="h-10 bg-background" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" /> Reason
          </label>
          <textarea 
            className="w-full min-h-[90px] p-3 text-xs sm:text-sm rounded-lg bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-foreground resize-y"
            placeholder={requestType === 'WFH' ? 'Briefly explain your reason for work from home...' : 'Briefly explain your reason for leave...'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Show Medical Certificate ONLY for Sick Leave */}
        {requestType === "LEAVE" && leaveType === "Sick Leave" && (
          <div className="space-y-2 border border-border rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground mb-3">
              <span className="flex items-center justify-center w-5 h-5 rounded-full border border-muted-foreground/50 text-[10px]">!</span>
              Medical Certificate <span className="text-muted-foreground font-normal text-xs">(Optional at time of application)</span>
            </div>
            
            <div className="relative border border-dashed border-border/60 rounded-lg p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:bg-muted/20 transition-colors cursor-pointer group">
              <input 
                type="file" 
                accept=".pdf,.jpg,.png" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileChange} 
              />
              <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground mb-2 group-hover:text-foreground transition-colors" />
              <p className="text-xs sm:text-sm font-medium text-foreground">
                {file ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-emerald-500 font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                      }}
                      className="text-xs text-muted-foreground hover:text-rose-500 underline ml-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </span>
                ) : (
                  <>Click to upload <span className="text-muted-foreground font-normal">or drag and drop</span></>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">PDF, JPG, PNG up to 3MB</p>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Sick leave is unpaid until a certificate is verified
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-border mt-2">
        <Button variant="outline" className="w-full sm:w-auto h-11 sm:h-10 text-xs sm:text-sm bg-transparent border-border text-foreground hover:bg-muted" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button className="w-full sm:w-auto h-11 sm:h-10 text-xs sm:text-sm bg-foreground text-background hover:bg-foreground/90 font-semibold" onClick={handleSubmit} disabled={loading} isLoading={loading}>
          Submit Application
        </Button>
      </div>
    </div>
  )
}
