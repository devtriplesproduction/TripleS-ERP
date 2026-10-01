CREATE TYPE announcement_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE announcement_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL, -- 'all', 'department'
  target_department TEXT,
  priority announcement_priority NOT NULL DEFAULT 'low',
  pinned BOOLEAN NOT NULL DEFAULT false,
  status announcement_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS (we disable it for local testing if needed, but it's good practice)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Since this is an internal ERP, we might use the disabled RLS or basic policies
-- (Assuming disabled RLS for now or standard policy)
CREATE POLICY "Enable all for authenticated users" ON announcements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON announcement_reads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
