'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

export async function getHolidaysAction(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createHolidayAction(payload: {
  date: string;
  name: string;
  is_optional: boolean;
  holiday_type: 'PAID' | 'UNPAID';
}): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('holidays')
      .insert({
        date: payload.date,
        name: payload.name,
        is_optional: payload.is_optional,
        holiday_type: payload.holiday_type
      })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath('/hr/holidays');
    revalidatePath('/admin-holiday');
    revalidatePath('/employee-holiday');
    return { success: true, data };
  } catch (err: any) {
    if (err.message?.includes('unique constraint')) {
      return { success: false, error: 'A holiday is already scheduled for this date. Please select a different date.' };
    }
    return { success: false, error: err.message };
  }
}

export async function deleteHolidayAction(id: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/hr/holidays');
    revalidatePath('/admin-holiday');
    revalidatePath('/employee-holiday');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateHolidayAction(
  id: string,
  payload: {
    date: string;
    name: string;
    is_optional: boolean;
    holiday_type: 'PAID' | 'UNPAID';
  }
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('holidays')
      .update({
        date: payload.date,
        name: payload.name,
        is_optional: payload.is_optional,
        holiday_type: payload.holiday_type,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/hr/holidays');
    revalidatePath('/admin-holiday');
    revalidatePath('/employee-holiday');
    return { success: true, data };
  } catch (err: any) {
    if (err.message?.includes('unique constraint')) {
      return { success: false, error: 'A holiday is already scheduled for this date. Please select a different date.' };
    }
    return { success: false, error: err.message };
  }
}
