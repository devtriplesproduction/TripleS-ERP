import { createClient } from "@/lib/supabase/server";

export async function getCompOffBalance(employeeId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comp_off_ledger')
    .select('hours, transaction_type')
    .eq('employee_id', employeeId);

  if (error || !data) {
    return 0;
  }

  const total = data.reduce((sum, row) => {
    if (row.transaction_type === 'CREDIT' || row.transaction_type === 'REVERSAL') {
      return sum + Number(row.hours);
    } else if (row.transaction_type === 'DEBIT') {
      return sum - Number(row.hours);
    }
    return sum;
  }, 0);
  return Math.max(0, total);
}

export async function processEODCompOff(eodId: string, employeeId: string, workedHours: number, status: string) {
  const supabase = await createClient();
  
  if (status !== 'Approved') return;
  
  const { data: existing } = await supabase
    .from('comp_off_ledger')
    .select('id')
    .eq('reference_id', eodId)
    .limit(1)
    .maybeSingle();
    
  if (existing) return;
  
  const diff = Number(workedHours) - 8;
  if (diff === 0) return;
  
  const currentBalance = await getCompOffBalance(employeeId);
  const newBalance = Math.max(0, currentBalance + diff);
  const actualDiff = newBalance - currentBalance;
  
  if (actualDiff === 0) return;
  
  const transactionType = actualDiff > 0 ? 'CREDIT' : 'DEBIT';
  
  await supabase.from('comp_off_ledger').insert({
    employee_id: employeeId,
    transaction_type: transactionType,
    hours: Math.abs(actualDiff),
    reference_id: eodId
  });
}

export async function processLeaveCompOff(leaveId: string, employeeId: string, durationDays: number, status: string) {
  const supabase = await createClient();
  
  if (status === 'Approved') {
    const { data: existing } = await supabase
      .from('comp_off_ledger')
      .select('id')
      .eq('reference_id', leaveId)
      .eq('transaction_type', 'DEBIT')
      .maybeSingle();
      
    if (!existing) {
      const hoursRequired = durationDays * 8;
      await supabase.from('comp_off_ledger').insert({
        employee_id: employeeId,
        transaction_type: 'DEBIT',
        hours: hoursRequired,
        reference_id: leaveId
      });
    }
  }
}
