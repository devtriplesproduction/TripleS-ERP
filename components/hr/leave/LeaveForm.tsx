"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, FileText, UploadCloud, Info, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function LeaveForm({ onCancel, currentEmployeeId, onSuccess, initialStatus = "Pending HR" }: { onCancel: () => void, currentEmployeeId: string, onSuccess: (leave: any) => void, initialStatus?: string }) {
  const [leaveType, setLeaveType] = useState("Sick Leave")
  const [duration, setDuration] = useState("Full Day")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [reason, setReason] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason) {
      toast.error("Please fill all required fields")
      return
    }
    if (!currentEmployeeId) {
      toast.error("User context missing")
      return
    }

    setLoading(true)
    let fileUrl = null

    if (file) {
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
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      is_half_day: duration === "Half Day",
      reason,
      status: initialStatus,
      medical_certificate_url: fileUrl
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert(newLeave)
      .select('*, employee:employee_onboarding!leave_requests_employee_id_fkey(first_name, last_name, email, department)')
      .single()

    setLoading(false)

    if (error) {
      console.error(error)
      toast.error("Failed to submit leave application")
    } else {
      toast.success("Leave application submitted successfully")
      onSuccess(data)
    }
  }
  
  return (
    <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6 text-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">New Leave Application</h1>
          <p className="text-sm text-muted-foreground mt-1">Apply for a new leave from your available leave balance.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="w-4 h-4 text-muted-foreground" /> Leave Type
          </label>
          <Select value={leaveType} onValueChange={(val) => val && setLeaveType(val)}>
            <SelectTrigger className="w-full bg-background border-border h-10">
              <SelectValue placeholder="Select Leave Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sick Leave">Sick Leave</SelectItem>
              <SelectItem value="Casual Leave">Casual Leave</SelectItem>
              <SelectItem value="Compensatory Off">Compensatory Off</SelectItem>
              <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" /> Leave Duration
          </label>
          <Select value={duration} onValueChange={(val) => val && setDuration(val)}>
            <SelectTrigger className="w-full bg-background border-border h-10">
              <SelectValue placeholder="Select Duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Full Day">Full Day</SelectItem>
              <SelectItem value="Half Day">Half Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" /> Start Date
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
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" /> End Date
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
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText className="w-4 h-4 text-muted-foreground" /> Reason
          </label>
          <textarea 
            className="w-full min-h-[100px] p-3 text-sm rounded-lg bg-background border border-border text-foreground outline-none focus:ring-1 focus:ring-foreground resize-y"
            placeholder="Briefly explain your reason for leave..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="space-y-2 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-muted-foreground/50 text-[10px]">!</span>
            Medical Certificate <span className="text-muted-foreground font-normal text-xs">(Optional at time of application)</span>
          </div>
          
          <div className="relative border border-dashed border-border/60 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/20 transition-colors cursor-pointer group">
            <input 
              type="file" 
              accept=".pdf,.jpg,.png" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
            />
            <UploadCloud className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-foreground transition-colors" />
            <p className="text-sm font-medium text-foreground">
              {file ? <span className="text-emerald-500">{file.name}</span> : <>Click to upload <span className="text-muted-foreground font-normal">or drag and drop</span></>}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 3MB</p>
          </div>
          
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            Sick leave is unpaid until a certificate is verified
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
        <Button variant="outline" className="bg-transparent border-border text-foreground hover:bg-muted" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button className="bg-foreground text-background hover:bg-foreground/90" onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Submit Application
        </Button>
      </div>
    </div>
  )
}
