-- Update eod_reports table to match the frontend expectations

ALTER TABLE eod_reports 
  RENAME COLUMN reviewed_by TO approved_by;

ALTER TABLE eod_reports 
  RENAME COLUMN reviewed_at TO approved_at;

ALTER TABLE eod_reports 
  RENAME COLUMN review_remarks TO rejection_reason;

ALTER TABLE eod_reports 
  ADD COLUMN location VARCHAR(50) DEFAULT 'Office',
  ADD COLUMN photo_url TEXT,
  ADD COLUMN job_card_numbers TEXT,
  ADD COLUMN tomorrows_plan TEXT,
  ADD COLUMN submitted_by UUID REFERENCES profiles(id);

-- RPC for submitting EOD
CREATE OR REPLACE FUNCTION submit_eod_rpc(
  p_employee_id UUID,
  p_report_date DATE,
  p_tasks_accomplished TEXT,
  p_office_hours NUMERIC,
  p_location VARCHAR(50),
  p_blockers TEXT,
  p_photo_url TEXT,
  p_status VARCHAR(50),
  p_submitted_by UUID,
  p_job_card_numbers TEXT,
  p_tomorrows_plan TEXT
) RETURNS UUID AS $$
DECLARE
  v_eod_id UUID;
BEGIN
  INSERT INTO eod_reports (
    employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, job_card_numbers, tomorrows_plan
  ) VALUES (
    p_employee_id, p_report_date, p_tasks_accomplished, p_office_hours, p_location, p_blockers, p_photo_url, p_status, p_submitted_by, p_job_card_numbers, p_tomorrows_plan
  ) RETURNING id INTO v_eod_id;
  
  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for updating EOD
CREATE OR REPLACE FUNCTION update_eod_rpc(
  p_employee_id UUID,
  p_report_date DATE,
  p_tasks_accomplished TEXT,
  p_office_hours NUMERIC,
  p_location VARCHAR(50),
  p_blockers TEXT,
  p_photo_url TEXT,
  p_status VARCHAR(50),
  p_submitted_by UUID,
  p_job_card_numbers TEXT,
  p_tomorrows_plan TEXT
) RETURNS UUID AS $$
DECLARE
  v_eod_id UUID;
BEGIN
  UPDATE eod_reports SET
    tasks_accomplished = p_tasks_accomplished,
    office_hours = p_office_hours,
    location = p_location,
    blockers = p_blockers,
    photo_url = COALESCE(NULLIF(p_photo_url, ''), photo_url),
    status = p_status,
    job_card_numbers = p_job_card_numbers,
    tomorrows_plan = p_tomorrows_plan,
    updated_at = NOW()
  WHERE employee_id = p_employee_id AND report_date = p_report_date
  RETURNING id INTO v_eod_id;
  
  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for reviewing EOD
CREATE OR REPLACE FUNCTION review_eod_rpc(
  p_eod_id UUID,
  p_status VARCHAR(50),
  p_rejection_reason TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE eod_reports SET
    status = p_status,
    rejection_reason = p_rejection_reason,
    approved_by = auth.uid(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
