const fs = require('fs');
let code = fs.readFileSync('components/hr/leave/LeaveClientPage.tsx', 'utf8');

code = code.replace(
  `import { toast } from "sonner"`,
  `import { toast } from "sonner"\nimport { reviewLeaveAction } from "@/actions/leave.actions"`
);

const oldHandle = `  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setApprovalLeaves(prev =>
      prev.map(leave => (leave.id === id ? { ...leave, status: newStatus } : leave))
    )
    
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: newStatus })
      .eq('id', id)
      
    if (error) {
      toast.error(\`Failed to update status to \${newStatus}\`)
      // Revert optimistic update (simplistic approach)
      setApprovalLeaves(leavesToApprove || [])
    } else {
      toast.success(\`Leave request \${newStatus}\`)
    }
  }`;

const newHandle = `  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // Optimistic update
    setApprovalLeaves(prev =>
      prev.map(leave => (leave.id === id ? { ...leave, status: newStatus } : leave))
    )
    
    const res = await reviewLeaveAction(id, newStatus);
      
    if (!res.success) {
      toast.error(res.error || \`Failed to update status to \${newStatus}\`)
      // Revert optimistic update (simplistic approach)
      setApprovalLeaves(leavesToApprove || [])
    } else {
      toast.success(\`Leave request \${newStatus}\`)
    }
  }`;

code = code.replace(oldHandle, newHandle);
fs.writeFileSync('components/hr/leave/LeaveClientPage.tsx', code);
console.log("Patched LeaveClientPage.tsx");
