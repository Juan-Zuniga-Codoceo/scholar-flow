-- Unified PostgreSQL Schema for Scholar-Flow (Self-Hosted/Local Mode)
-- Replaces Supabase Auth dependencies and integrates RLS/multi-tenant changes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE, -- e.g. "demo"
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now() + INTERVAL '14 days'),
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  price_per_user INTEGER NOT NULL DEFAULT 3000,
  logo_url TEXT DEFAULT NULL,
  primary_color VARCHAR(7) DEFAULT NULL,
  secondary_color VARCHAR(7) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Users Table (Self-contained JWT auth, no auth.users dependency)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member', check (role in ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- 3. Professors Table (Nómina)
CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rut TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subjects TEXT[], -- Array of strings e.g. ['Matemáticas', 'Física']
  contract_hours INTEGER DEFAULT 44,
  is_available BOOLEAN DEFAULT true,
  contract_type TEXT NOT NULL DEFAULT 'planta',
  check (contract_type in ('planta', 'reemplazo', 'honorarios')),
  assigned_hours INTEGER DEFAULT 0,
  parent_attention_hours TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, rut)
);

CREATE INDEX IF NOT EXISTS idx_professors_org_id ON professors(organization_id);

-- 4. Medical Licenses Table
CREATE TABLE IF NOT EXISTS medical_licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User who uploaded the license
  professor_name TEXT NOT NULL,
  professor_rut TEXT NOT NULL,
  diagnosis_code TEXT,       -- Optional/Private
  days_count INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  health_entity TEXT,        -- Isapre/Fonasa/Compin
  status TEXT NOT NULL DEFAULT 'pending_replacement', 
  check (status in ('pending_replacement', 'covered', 'rejected')),
  replacement_professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  file_path TEXT,            -- Path/URL to original uploaded file (PDF/Image)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_licenses_org_id ON medical_licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON medical_licenses(status);

-- 5. Courses Table (Clases)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "1° Medio A"
  homeroom_teacher_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_org_id ON courses(organization_id);

-- 6. Course Subjects Table (Horas asignadas por asignatura)
CREATE TABLE IF NOT EXISTS course_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  weekly_hours INTEGER NOT NULL,
  professor_id UUID REFERENCES professors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_subjects_course_id ON course_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_course_subjects_prof_id ON course_subjects(professor_id);

-- 7. Schedule Slots Table
CREATE TABLE IF NOT EXISTS schedule_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  course_subject_id UUID NOT NULL REFERENCES course_subjects(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  period_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(course_id, day_of_week, period_number)
);

CREATE INDEX IF NOT EXISTS idx_schedule_slots_org_id ON schedule_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_course_id ON schedule_slots(course_id);

-- 8. Knowledge Base Chunks (Base Vectorial para Chatbot RAG)
CREATE TABLE IF NOT EXISTS knowledge_base_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_name TEXT,
  content TEXT NOT NULL,
  embedding DOUBLE PRECISION[] NOT NULL
);

-- ==========================================
-- SEED DATA (Datos de Prueba)
-- ==========================================

-- 1. Insert Demo Organization
INSERT INTO organizations (id, name, subdomain, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Colegio Demo', 'demo', 'free')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  subdomain = EXCLUDED.subdomain,
  subscription_status = EXCLUDED.subscription_status;

-- 2. Insert Demo Admin User (Password is '1234')
INSERT INTO users (id, email, password_hash, organization_id, full_name, role)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'admin@demo.scholarflow.app', 
  '$2b$12$pzzzK/mH9YMw8FlfuusCS.RPvLGXwwZoZjsinFxUV.kNWXoXPNL9.', 
  '00000000-0000-0000-0000-000000000000', 
  'Administrador Demo', 
  'admin'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 3. Insert Demo Professors (including contract_type and assigned_hours)
INSERT INTO professors (id, organization_id, rut, full_name, subjects, contract_hours, contract_type, assigned_hours, is_available)
VALUES 
  ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '11.111.111-1', 'Juan Pérez', ARRAY['Matemáticas', 'Física'], 44, 'planta', 36, true),
  ('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', '22.222.222-2', 'Maria González', ARRAY['Lenguaje', 'Historia'], 30, 'honorarios', 24, true),
  ('f0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', '33.333.333-3', 'Carlos Ruiz', ARRAY['Biología', 'Química'], 44, 'planta', 30, true),
  ('f0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', '44.444.444-4', 'Ana Lopez', ARRAY['Inglés', 'Artes Visuales'], 22, 'reemplazo', 0, true),
  ('f0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', '55.555.555-5', 'Pedro Soto', ARRAY['Educación Física', 'Música'], 40, 'planta', 32, true),
  ('f0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', '66.666.666-6', 'Sofia Vergara', ARRAY['Matemáticas', 'Tecnología'], 44, 'reemplazo', 0, true),
  ('f0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', '77.777.777-7', 'Diego Torres', ARRAY['Historia', 'Geografía'], 30, 'honorarios', 12, true),
  ('f0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', '88.888.888-8', 'Lucia Mendez', ARRAY['Inglés', 'Lenguaje'], 44, 'planta', 40, true),
  ('f0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', '99.999.999-9', 'Roberto Diaz', ARRAY['Matemáticas', 'Física'], 44, 'reemplazo', 0, true),
  ('f0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', '10.100.100-1', 'Andrea Rojas', ARRAY['Biología', 'Química'], 44, 'reemplazo', 0, true)
ON CONFLICT (organization_id, rut) DO UPDATE SET 
  id = EXCLUDED.id,
  full_name = EXCLUDED.full_name, 
  subjects = EXCLUDED.subjects, 
  contract_hours = EXCLUDED.contract_hours, 
  contract_type = EXCLUDED.contract_type, 
  assigned_hours = EXCLUDED.assigned_hours,
  is_available = EXCLUDED.is_available;

-- 4. Insert Demo Courses
INSERT INTO courses (id, organization_id, name)
VALUES 
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '1° Medio A'),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', '2° Medio B'),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', '3° Medio A'),
  ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', '4° Medio B'),
  ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', '5° Básico A'),
  ('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', '6° Básico B'),
  ('c0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', '7° Básico A'),
  ('c0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', '8° Básico B')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. Insert Course Subjects mapping
INSERT INTO course_subjects (id, course_id, subject_name, weekly_hours, professor_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Matemáticas', 6, 'f0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Física', 4, 'f0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Biología', 4, 'f0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Lenguaje', 6, 'f0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'Historia', 4, 'f0000000-0000-0000-0000-000000000007'),
  ('a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'Inglés', 4, 'f0000000-0000-0000-0000-000000000008'),
  ('a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'Matemáticas', 6, 'f0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000002', 'Lenguaje', 6, 'f0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000002', 'Química', 4, 'f0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000002', 'Educación Física', 4, 'f0000000-0000-0000-0000-000000000005'),
  ('a0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000005', 'Matemáticas', 6, 'f0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000005', 'Lenguaje', 6, 'f0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000005', 'Historia', 4, 'f0000000-0000-0000-0000-000000000007'),
  ('a0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000005', 'Inglés', 4, 'f0000000-0000-0000-0000-000000000008')
ON CONFLICT (id) DO UPDATE SET 
  course_id = EXCLUDED.course_id,
  subject_name = EXCLUDED.subject_name,
  weekly_hours = EXCLUDED.weekly_hours,
  professor_id = EXCLUDED.professor_id;

-- 6. Insert Medical Licenses
INSERT INTO medical_licenses (id, organization_id, user_id, professor_name, professor_rut, diagnosis_code, days_count, start_date, end_date, health_entity, status, replacement_professor_id)
VALUES
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Juan Pérez', '11.111.111-1', 'J11.9', 10, CURRENT_DATE, CURRENT_DATE + INTERVAL '9 days', 'Fonasa', 'pending_replacement', NULL),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Carlos Ruiz', '33.333.333-3', 'S82.1', 30, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '14 days', 'Isapre Banmédica', 'covered', 'f0000000-0000-0000-0000-000000000010'),
  ('e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Maria González', '22.222.222-2', 'F43.2', 7, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '7 days', 'Isapre Colmena', 'pending_replacement', NULL)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  user_id = EXCLUDED.user_id,
  professor_name = EXCLUDED.professor_name,
  professor_rut = EXCLUDED.professor_rut,
  diagnosis_code = EXCLUDED.diagnosis_code,
  days_count = EXCLUDED.days_count,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  health_entity = EXCLUDED.health_entity,
  status = EXCLUDED.status,
  replacement_professor_id = EXCLUDED.replacement_professor_id;

-- 7. Insert Schedule Slots
INSERT INTO schedule_slots (organization_id, course_id, course_subject_id, day_of_week, period_number)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 1),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 2),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 1, 3),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 1, 4),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, 1),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2, 2),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 2, 3),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 2, 4),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 3, 1),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 3, 2),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 3, 3),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 3, 4),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 4, 1),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 4, 2),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 4, 3),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 4, 4),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 5, 1),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 5, 2)
ON CONFLICT (course_id, day_of_week, period_number) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  course_subject_id = EXCLUDED.course_subject_id;
