'use server'

import { createClient } from "@/lib/supabase/server";

export type RulebookCategory = 'Work Policy' | 'Security & IT' | 'Leave & PTO' | 'Attendance' | 'Human Resources';
export type RulebookStatus = 'Draft' | 'Published' | 'Archived';

export interface CompanyRule {
  id: string;
  title: string;
  category: RulebookCategory;
  description: string;
  version: string;
  status: RulebookStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  effective_date?: string;
  previous_version_id?: string;
}

export async function getRules(role: 'Admin' | 'HR' | 'Employee') {
  const supabase = await createClient();
  let query = supabase.from('company_rules').select('*').order('created_at', { ascending: false });
  // For Employee, we could fetch all Published. BUT if they can see multiple versions of the same rule, 
  // maybe we should just fetch the latest for each rule. We'll leave the query as is, 
  // but just be aware we might need distinct on rule id if they want only latest.
  
  if (role === 'Employee') {
    query = query.eq('status', 'Published');
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching rules:", error);
    return [];
  }
  return data as CompanyRule[];
}

export async function createRule(rule: Omit<CompanyRule, 'id' | 'created_at' | 'updated_at' | 'version' | 'previous_version_id'>) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('company_rules').insert({
    ...rule,
    version: '1.0'
  }).select().single();
  
  if (error) throw error;
  return data;
}

export async function updateRule(ruleId: string, updates: Partial<CompanyRule>, createNewVersion: boolean = false, changeType: 'Minor' | 'Major' = 'Minor') {
  const supabase = await createClient();
  
  if (createNewVersion) {
    // Get existing rule
    const { data: existing } = await supabase.from('company_rules').select('*').eq('id', ruleId).single();
    if (existing) {
      // Calculate new version
      let nextVersion = '1.0';
      if (existing.version) {
        const parts = existing.version.split('.').map(Number);
        let major = parts[0] || 1;
        let minor = parts[1] || 0;
        
        if (changeType === 'Major') {
          major += 1;
          minor = 0;
        } else {
          minor += 1;
        }
        nextVersion = `${major}.${minor}`;
      }

      // Create new version
      const { data, error } = await supabase.from('company_rules').insert({
        title: updates.title || existing.title,
        category: updates.category || existing.category,
        description: updates.description || existing.description,
        version: nextVersion,
        status: updates.status || 'Draft',
        created_by: updates.created_by || existing.created_by,
        published_at: updates.status === 'Published' ? new Date().toISOString() : null,
        effective_date: updates.effective_date || existing.effective_date,
        previous_version_id: existing.id
      }).select().single();
      
      if (error) throw error;
      return data;
    }
  } else {
    // Just update
    const { data, error } = await supabase.from('company_rules').update(updates).eq('id', ruleId).select().single();
    if (error) throw error;
    return data;
  }
}

export async function getRuleHistory(ruleId: string) {
  const supabase = await createClient();
  
  const history: CompanyRule[] = [];
  let currentId = ruleId;
  
  while (currentId) {
    const { data } = await supabase.from('company_rules').select('*').eq('id', currentId).single();
    if (data) {
      history.push(data);
      currentId = data.previous_version_id;
    } else {
      break;
    }
  }
  
  return history;
}

export async function getAcknowledgments(employeeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('employee_rule_acknowledgements').select('*').eq('employee_id', employeeId);
  if (error) return [];
  return data;
}

export async function acknowledgeRule(employeeId: string, ruleId: string, version: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('employee_rule_acknowledgements').upsert({
    employee_id: employeeId,
    rule_id: ruleId,
    version: version
  }, { onConflict: 'employee_id, rule_id, version' });
  
  if (error) throw error;
  return true;
}

export async function deleteRule(ruleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('company_rules').delete().eq('id', ruleId);
  if (error) throw error;
  return true;
}
