-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations Table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'free', check (plan_type in ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Users Table (Linking to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member', check (role in ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- 3. RLS Policies

-- Enable RLS on tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
-- This avoids repeating the subquery in every policy
CREATE OR REPLACE FUNCTION get_auth_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Users Table Policies
-- Policy: Users can view members of their own organization
CREATE POLICY "Users can view members of own organization"
  ON users
  FOR SELECT
  USING (organization_id = get_auth_organization_id());

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Organizations Table Policies
-- Policy: Users can view their own organization details
CREATE POLICY "Users can view own organization"
  ON organizations
  FOR SELECT
  USING (id = get_auth_organization_id());

-- Policy: Only Admins can update organization details
CREATE POLICY "Admins can update organization"
  ON organizations
  FOR UPDATE
  USING (
    id = get_auth_organization_id() 
    AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Note: Insert policies usually handled by invitation/signup flows or edge functions
-- allowing direct insert might be dangerous depending on the signup flow.
-- For now, we assume org creation happens via specific secure procedures.
