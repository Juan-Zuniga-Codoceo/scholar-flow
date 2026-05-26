-- Migration 004: Add schedule_slots table for weekly timetables
CREATE TABLE IF NOT EXISTS schedule_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  course_subject_id UUID NOT NULL REFERENCES course_subjects(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1: Lunes, 5: Viernes
  period_number INTEGER NOT NULL, -- Bloque de clases (ej: 1 al 8)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- A course cannot have multiple subjects scheduled at the same period of a day
  UNIQUE(course_id, day_of_week, period_number)
);

CREATE INDEX IF NOT EXISTS idx_schedule_slots_org_id ON schedule_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_course_id ON schedule_slots(course_id);
