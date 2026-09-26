// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { submitEODAction, fetchEODAction, updateEODAction } from '@/actions/eod.actions';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/Dropdown';
import { ImagePlus, X, Plus, User, Key } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';

type EmployeeOption = { id: string; first_name: string; last_name: string; employee_id: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function EODSubmissionForm({ employeeId, canEditDate = false, employees, canManage = false }: { employeeId: string, canEditDate?: boolean, employees?: EmployeeOption[], canManage?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useState<'Office' | 'Field'>('Office');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeId);
  const [reportDate, setReportDate] = useState<string>(todayDate);
  const [isUpdate, setIsUpdate] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [tasksAccomplished, setTasksAccomplished] = useState('');
  const [officeHours, setOfficeHours] = useState<string>('');
  const [blockers, setBlockers] = useState('');
  const [jobCardNumbers, setJobCardNumbers] = useState<string[]>([]);
  const [jobCardInput, setJobCardInput] = useState('');

  const addJobCard = (e?: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const val = jobCardInput.trim();
    if (val && !jobCardNumbers.includes(val)) {
      setJobCardNumbers([...jobCardNumbers, val]);
      setJobCardInput('');
    }
  };

  const removeJobCard = (card: string) => {
    setJobCardNumbers(jobCardNumbers.filter(c => c !== card));
  };
  const [tomorrowsPlan, setTomorrowsPlan] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  // Fetch existing EOD if canManage is true and they select an employee/date
  useEffect(() => {
    if (!canManage) return;

    async function fetchExisting() {
      setFetching(true);
      setError('');
      setSuccess('');
      const res = await fetchEODAction(selectedEmployeeId, reportDate);
      if (res.success && 'data' in res && res.data) {
        setIsUpdate(true);
        setTasksAccomplished(res.data.tasks_accomplished);
        setOfficeHours(res.data.office_hours.toString());
        setLocation(res.data.location as 'Office' | 'Field' | 'Work From Home');
        setBlockers(res.data.blockers || '');
        const jcn = (res.data as Record<string, unknown>).job_card_numbers as string || '';
        setJobCardNumbers(jcn ? jcn.split(',').map(s => s.trim()).filter(Boolean) : []);
        setTomorrowsPlan((res.data as Record<string, unknown>).tomorrows_plan as string || '');
        setExistingPhotoUrl(res.data.photo_url || null);
        // Note: Existing photo preview isn't easily loadable as a File, we'd need public URL to show it.
        // The RPC uses COALESCE so if we send no file, it keeps the old one.
        setFile(null);
      } else {
        setIsUpdate(false);
        setTasksAccomplished('');
        setOfficeHours('');
        setLocation('Office');
        setBlockers('');
        setJobCardNumbers([]);
        setTomorrowsPlan('');
        setExistingPhotoUrl(null);
        setFile(null);
      }
      setFetching(false);
    }
    fetchExisting();
  }, [selectedEmployeeId, reportDate, canManage]);

  useEffect(() => {
    let url: string | null = null;
    if (file) {
      url = URL.createObjectURL(file);
      Promise.resolve().then(() => setFileUrl(url));
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    } else {
      Promise.resolve().then(() => setFileUrl(null));
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }
    if (!selectedFile.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      setFile(null);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB.');
      setFile(null);
      return;
    }
    setError('');
    setFile(selectedFile);
  };

  const removePhoto = () => {
    setFile(null);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (location === 'Field' && !file && !existingPhotoUrl) {
        throw new Error("A field photo is required when submitting a Field report.");
      }

      let photoPath = '';

      if (location === 'Field' && file) {
        // Securely upload the file directly using the authenticated client
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedEmployeeId}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('eod_photos')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Failed to upload photo: ${uploadError.message}`);
        }

        photoPath = uploadData.path; // Store the secure internal path, NOT a public URL
      }

      const formData = new FormData(e.currentTarget);
      formData.append('employee_id', selectedEmployeeId);
      if (photoPath) {
        formData.set('photo_url', photoPath);
      } else if (existingPhotoUrl) {
        formData.set('photo_url', existingPhotoUrl);
      } else {
        formData.delete('photo_url');
      }

      if (!canEditDate) {
        // Ensure the correct date is always sent for regular users, ignoring any client manipulations
        formData.set('report_date', todayDate);
      } else {
        formData.set('report_date', reportDate);
      }

      const res = isUpdate ? await updateEODAction(formData) : await submitEODAction(formData);

      if (!res.success) {
        throw new Error(res.error || 'Failed to submit EOD');
      }

      toast.success(isUpdate ? 'EOD Updated successfully!' : 'EOD Submitted successfully!');
      if (!isUpdate) {
        (e.target as HTMLFormElement).reset();
        setFile(null);
        setExistingPhotoUrl(null);
        setLocation('Office');
        setTasksAccomplished('');
        setOfficeHours('');
        setBlockers('');
        setJobCardNumbers([]);
        setTomorrowsPlan('');
      }
      router.refresh();

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-xl shadow-sm border border-border space-y-6">
      <div className="bg-surface/50 border border-border p-4 rounded-lg flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Submitting as: {canManage && employees ? (employees.find(e => e.id === selectedEmployeeId)?.first_name || 'Omkar Sawant') : 'Omkar Sawant'}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Key className="h-3 w-3" />
              {selectedEmployeeId || employeeId}
            </p>
          </div>
        </div>
      </div>
      {error && <div className="text-error text-sm bg-error/10 p-3 rounded-lg border border-error/20 font-medium">{error}</div>}

      <div className="space-y-4">
        {canManage && employees && (
          <Dropdown
            label="Employee"
            name="employee_id_select"
            required
            value={selectedEmployeeId}
            onChange={(val) => setSelectedEmployeeId(val)}
            options={employees.map(e => ({ label: `${e.first_name} ${e.last_name} (${e.employee_id})`, value: e.id }))}
          />
        )}

        {canEditDate ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Report Date</label>
            <DatePicker
              value={reportDate}
              onChange={(date) => setReportDate(date)}
            />
            <input type="hidden" name="report_date" value={reportDate} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Report Date</label>
            <DatePicker
              value={todayDate}
              disabled
            />
            <input type="hidden" name="report_date" value={todayDate} />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Work Done Today</label>
          <textarea
            name="tasks_accomplished"
            required
            rows={6}
            value={tasksAccomplished}
            onChange={(e) => setTasksAccomplished(e.target.value)}
            className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="What did you do today?"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Worked Hours <span className="text-error">*</span></label>
            <Input
              type="number"
              name="office_hours"
              required
              min="0"
              max="12"
              step="0.5"
              placeholder="e.g. 8"
              value={officeHours}
              onChange={(e) => setOfficeHours(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                  e.preventDefault();
                }
              }}
              className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>

          <Dropdown
            label="Location"
            buttonClassName="!w-full"
            name="location"
            required
            value={location}
            onChange={(val) => setLocation(val as 'Office' | 'Field' | 'Work From Home')}
            options={[
              { label: "Office", value: "Office" },
              { label: "Work From Home", value: "Work From Home" }
            ]}
          />
        </div>

        {location === 'Field' && (
          <div className="space-y-2 p-4 border border-dashed rounded-lg bg-surface relative">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-foreground">
                Field Photo <span className="text-error">*</span>
              </label>
              {file && (
                <Button type="button" variant="ghost" size="sm" onClick={removePhoto} className="text-error hover:text-error hover:bg-error/10 h-8 px-2">
                  <X className="w-4 h-4 mr-1" /> Remove
                </Button>
              )}
            </div>

            {!file ? (
              <div className="flex justify-center items-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                  <input id="dropzone-file" type="file" accept="image/*" onChange={handleFileChange} className="hidden" required={location === 'Field' && !existingPhotoUrl} />
                </label>
              </div>
            ) : (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                {fileUrl && <Image src={fileUrl} alt="Preview" fill className="object-cover" />}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Pending Work/Blockers <span className="text-error ml-1">*</span></label>
          <textarea
            name="blockers"
            rows={6}
            value={blockers}
            required
            onChange={(e) => setBlockers(e.target.value)}
            className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Any issues blocking your work? (Write 'None' if none)"
          ></textarea>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Tomorrow&apos;s Plan <span className="text-error ml-1">*</span></label>
          <textarea
            name="tomorrows_plan"
            rows={6}
            value={tomorrowsPlan}
            required
            onChange={(e) => setTomorrowsPlan(e.target.value)}
            className="flex w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="What is your plan for tomorrow?"
          ></textarea>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading || fetching}>
        {loading ? (isUpdate ? 'Updating...' : 'Submitting...') : (isUpdate ? 'Update EOD' : 'Submit EOD')}
      </Button>
    </form>
  );
}

