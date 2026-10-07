ALTER TABLE eod_reports ADD COLUMN IF NOT EXISTS admin_note TEXT;

CREATE OR REPLACE FUNCTION update_eod_rpc(
  p_employee_id UUID,
  p_report_date DATE,
  p_tasks_accomplished TEXT,
  p_office_hours NUMERIC,
  p_location TEXT,
  p_blockers TEXT,
  p_photo_url TEXT,
  p_status TEXT,
  p_submitted_by UUID,
  p_job_card_numbers TEXT,
  p_tomorrows_plan TEXT,
  p_admin_note TEXT DEFAULT NULL
) RETURNS UUID AS $\$
DECLARE
  v_eod_id UUID;
BEGIN
  -- We just update existing report (or insert if not exists, but we assume it exists in this flow)
  -- The update UI should really just pass the ID, but the original RPC used employee_id + date.
  UPDATE eod_reports
  SET
    tasks_accomplished = p_tasks_accomplished,
    office_hours = p_office_hours,
    location = p_location,
    blockers = p_blockers,
    photo_url = p_photo_url,
    status = p_status,
    job_card_numbers = p_job_card_numbers,
    tomorrows_plan = p_tomorrows_plan,
    admin_note = COALESCE(p_admin_note, admin_note),
    submitted_at = NOW()
  WHERE employee_id = p_employee_id AND report_date = p_report_date
  RETURNING id INTO v_eod_id;
  
  RETURN v_eod_id;
END;
$\$ LANGUAGE plpgsql;
