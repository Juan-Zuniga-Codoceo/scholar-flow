-- Alter professors table to add contract type and assigned hours
ALTER TABLE professors 
ADD COLUMN contract_type TEXT DEFAULT 'planta' CHECK (contract_type IN ('planta', 'reemplazo', 'honorarios')),
ADD COLUMN assigned_hours INTEGER DEFAULT 0;

-- Create course_subjects table to link courses, subjects, hours, and professors
CREATE TABLE course_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  hours_per_week INTEGER NOT NULL,
  professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_course_subjects_org_id ON course_subjects(organization_id);
CREATE INDEX idx_course_subjects_course_id ON course_subjects(course_id);
CREATE INDEX idx_course_subjects_prof_id ON course_subjects(professor_id);

-- Enable Row Level Security (RLS)
ALTER TABLE course_subjects ENABLE ROW LEVEL SECURITY;

-- Policies for course_subjects
CREATE POLICY "Users can view org course_subjects" 
  ON course_subjects 
  FOR SELECT 
  USING (organization_id = get_auth_organization_id());

-- Dev Access Policy (similar to professors/courses tables)
CREATE POLICY "Dev Access course_subjects" 
  ON course_subjects 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
