const fs = require('fs');
const path = 'c:/Users/HP/Desktop/Triple S Production/TripleS-ERP/components/eod/ReviewDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
content = content.replace(
  `import { reviewEODAction } from '@/actions/eod.actions';`,
  `import { reviewEODAction, updateEODAction } from '@/actions/eod.actions';\nimport { Edit2, Save, X as XIcon } from 'lucide-react';`
);

// Add state variables
content = content.replace(
  `const [actionError, setActionError] = useState('');`,
  `const [actionError, setActionError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<EnrichedEOD>>({});

  const handleEditChange = (field: keyof EnrichedEOD, value: string | number) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  }

  const handleSaveEdit = async () => {
    if (!selectedEod) return;
    setIsSubmitting(true);
    setActionError('');
    try {
      const formData = new FormData();
      formData.append('employee_id', selectedEod.employee_id);
      formData.append('report_date', selectedEod.report_date);
      formData.append('tasks_accomplished', editFormData.tasks_accomplished as string || '');
      formData.append('office_hours', String(editFormData.office_hours));
      formData.append('location', selectedEod.location);
      formData.append('blockers', editFormData.blockers as string || 'None');
      formData.append('job_card_numbers', editFormData.job_card_numbers as string || '');
      formData.append('tomorrows_plan', editFormData.tomorrows_plan as string || '');
      formData.append('role_context', (selectedEod as any).role_context || 'Employee');
      if (selectedEod.photo_url) formData.append('photo_url', selectedEod.photo_url);

      const res = await updateEODAction(formData);
      if (res.success) {
        setIsEditing(false);
        const updatedFields = {
          tasks_accomplished: editFormData.tasks_accomplished as string,
          blockers: editFormData.blockers as string,
          tomorrows_plan: editFormData.tomorrows_plan as string,
          office_hours: editFormData.office_hours as number,
          job_card_numbers: editFormData.job_card_numbers as string
        };
        setEods(prev => prev.map(e => e.id === selectedEod.id ? { ...e, ...updatedFields } : e));
        setSelectedEod(prev => prev ? { ...prev, ...updatedFields } : null);
      } else {
        setActionError(res.error || 'Failed to update EOD.');
      }
    } catch (e) {
      setActionError('Unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }`
);

// Update handleOpenModal
content = content.replace(
  `const handleOpenModal = (eod: EnrichedEOD) => {`,
  `const handleOpenModal = (eod: EnrichedEOD) => {
    setIsEditing(false);
    setEditFormData({
      tasks_accomplished: eod.tasks_accomplished,
      blockers: eod.blockers || '',
      tomorrows_plan: eod.tomorrows_plan || '',
      office_hours: eod.office_hours,
      job_card_numbers: eod.job_card_numbers || '',
    });`
);

// Replace office_hours display with edit input
content = content.replace(
  `<p className="font-semibold text-foreground text-sm">{selectedEod.office_hours}h</p>`,
  `{isEditing ? (
    <Input type="number" step="0.1" value={editFormData.office_hours || 0} onChange={e => handleEditChange('office_hours', parseFloat(e.target.value) || 0)} className="w-full h-8 px-2 text-sm mt-1" />
  ) : (
    <p className="font-semibold text-foreground text-sm">{selectedEod.office_hours}h</p>
  )}`
);

// Replace tasks_accomplished
content = content.replace(
  `{selectedEod.tasks_accomplished}`,
  `{isEditing ? (
    <textarea value={editFormData.tasks_accomplished} onChange={e => handleEditChange('tasks_accomplished', e.target.value)} className="w-full flex rounded-lg border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={5} />
  ) : (
    selectedEod.tasks_accomplished
  )}`
);

// Replace blockers
content = content.replace(
  `{selectedEod.blockers}`,
  `{isEditing ? (
    <textarea value={editFormData.blockers} onChange={e => handleEditChange('blockers', e.target.value)} className="w-full flex rounded-lg border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} />
  ) : (
    selectedEod.blockers
  )}`
);

// Replace tomorrows_plan
content = content.replace(
  `{selectedEod.tomorrows_plan}`,
  `{isEditing ? (
    <textarea value={editFormData.tomorrows_plan} onChange={e => handleEditChange('tomorrows_plan', e.target.value)} className="w-full flex rounded-lg border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} />
  ) : (
    selectedEod.tomorrows_plan
  )}`
);

// Make sure blockers and tomorrows_plan always render in edit mode even if empty initially
content = content.replace(
  `{selectedEod.blockers && (`,
  `{(selectedEod.blockers || isEditing) && (`
);
content = content.replace(
  `{selectedEod.tomorrows_plan && (`,
  `{(selectedEod.tomorrows_plan || isEditing) && (`
);

// Add Edit Button to Footer Actions
content = content.replace(
  `<Button variant="outline" className="text-foreground border-border hover:bg-muted hover:text-foreground rounded-xl" onClick={() => handleAction('Reject')} disabled={isSubmitting}>`,
  `{!isEditing ? (
    <Button variant="outline" className="text-foreground border-border hover:bg-muted hover:text-foreground rounded-xl" onClick={() => setIsEditing(true)} disabled={isSubmitting}>
      <Edit2 className="w-4 h-4 mr-2" /> Edit
    </Button>
  ) : (
    <>
      <Button variant="ghost" className="text-muted-foreground rounded-xl" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
        <XIcon className="w-4 h-4 mr-2" /> Cancel
      </Button>
      <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm" onClick={handleSaveEdit} disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
      </Button>
    </>
  )}
  {!isEditing && <Button variant="outline" className="text-foreground border-border hover:bg-muted hover:text-foreground rounded-xl" onClick={() => handleAction('Reject')} disabled={isSubmitting}>`
);

content = content.replace(
  `<CheckCircle2 className="w-4 h-4 mr-2" />} Approve Report\n                        </Button>`,
  `<CheckCircle2 className="w-4 h-4 mr-2" />} Approve Report\n                        </Button>\n                        }`
);


fs.writeFileSync(path, content, 'utf8');
