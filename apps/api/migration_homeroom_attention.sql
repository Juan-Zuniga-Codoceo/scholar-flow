-- Migration: Add homeroom teacher to courses and parent attention hours to professors
ALTER TABLE courses ADD COLUMN IF NOT EXISTS homeroom_teacher_id UUID REFERENCES professors(id) ON DELETE SET NULL;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS parent_attention_hours TEXT DEFAULT NULL;
