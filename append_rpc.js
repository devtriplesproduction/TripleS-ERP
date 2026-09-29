const fs = require('fs');

const additionalMigration = `
-- 4. Update submit_eod_rpc to include role_context
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
  p_tomorrows_plan TEXT,
  p_role_context TEXT DEFAULT 'Employee'
) RETURNS UUID AS $$
DECLARE
  v_eod_id UUID;
BEGIN
  INSERT INTO eod_reports (
    employee_id, report_date, tasks_accomplished, office_hours, location, blockers, photo_url, status, submitted_by, job_card_numbers, tomorrows_plan, role_context
  ) VALUES (
    p_employee_id, p_report_date, p_tasks_accomplished, p_office_hours, p_location, p_blockers, p_photo_url, p_status, p_submitted_by, p_job_card_numbers, p_tomorrows_plan, p_role_context
  ) RETURNING id INTO v_eod_id;
  
  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update update_eod_rpc to include role_context
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
  p_tomorrows_plan TEXT,
  p_role_context TEXT DEFAULT 'Employee'
) RETURNS UUID AS $$
DECLARE
  v_eod_id UUID;
BEGIN
  UPDATE eod_reports SET
    tasks_accomplished = p_tasks_accomplished,
    office_hours = p_office_hours,
    location = p_location,
    blockers = p_blockers,
    photo_url = p_photo_url,
    status = p_status,
    job_card_numbers = p_job_card_numbers,
    tomorrows_plan = p_tomorrows_plan,
    role_context = p_role_context
  WHERE employee_id = p_employee_id AND report_date = p_report_date
  RETURNING id INTO v_eod_id;
  
  RETURN v_eod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

let content = fs.readFileSync('supabase/migrations/20260928000000_add_eod_role_context.sql', 'utf8');
if (!content.includes('submit_eod_rpc')) {
  fs.appendFileSync('supabase/migrations/20260928000000_add_eod_role_context.sql', additionalMigration);
  console.log('Appended RPC updates to migration');
} else {
  console.log('RPC updates already exist in migration');
}
