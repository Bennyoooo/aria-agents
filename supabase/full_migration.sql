-- ============================================
-- ARIA SKILL MARKETPLACE - FULL SCHEMA
-- Paste this entire file into Supabase SQL Editor and click Run
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. Create all tables first (no cross-references)
-- ============================================

CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  domain          text NOT NULL UNIQUE,
  api_key         text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  full_name       text,
  organization_id uuid REFERENCES organizations(id),
  function_team   text,
  contributor_role text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE skills (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  owner_id        uuid NOT NULL REFERENCES profiles(id),
  title           text NOT NULL,
  description     text NOT NULL CHECK (char_length(description) >= 50),
  skill_type      text NOT NULL CHECK (skill_type IN ('prompt', 'workflow', 'tool', 'context_pack')),
  instructions    text NOT NULL,
  agent_compatibility text[] NOT NULL DEFAULT '{}',
  function_team   text NOT NULL,
  tags            text[] DEFAULT '{}',
  data_sensitivity text NOT NULL DEFAULT 'internal' CHECK (data_sensitivity IN ('public', 'internal', 'confidential')),
  is_hidden       boolean DEFAULT false,
  tips            text,
  current_version integer DEFAULT 1,
  forked_from     uuid REFERENCES skills(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id        uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id),
  source          text NOT NULL CHECK (source IN ('agent', 'web')),
  outcome         text NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  rating          integer CHECK (rating >= 1 AND rating <= 5),
  notes           text,
  agent_name      text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE copy_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id        uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id),
  source          text NOT NULL CHECK (source IN ('web', 'mcp')),
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE skill_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id        uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  title           text NOT NULL,
  description     text NOT NULL,
  instructions    text NOT NULL,
  tips            text,
  changed_by      uuid REFERENCES profiles(id),
  change_summary  text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(skill_id, version_number)
);

-- ============================================
-- 2. Triggers
-- ============================================

CREATE TRIGGER set_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE OR REPLACE FUNCTION create_skill_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.instructions IS DISTINCT FROM NEW.instructions
     OR OLD.title IS DISTINCT FROM NEW.title
     OR OLD.description IS DISTINCT FROM NEW.description
     OR OLD.tips IS DISTINCT FROM NEW.tips THEN
    INSERT INTO skill_versions (skill_id, version_number, title, description, instructions, tips, changed_by)
    VALUES (OLD.id, OLD.current_version, OLD.title, OLD.description, OLD.instructions, OLD.tips, auth.uid());
    NEW.current_version := OLD.current_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_version_skill
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION create_skill_version();

-- ============================================
-- 3. Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_skills_forked_from ON skills(forked_from) WHERE forked_from IS NOT NULL;

-- ============================================
-- 4. Enable RLS on all tables
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies (all tables exist now)
-- ============================================

-- Organizations
CREATE POLICY "Users can view their own org"
  ON organizations FOR SELECT
  USING (id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Profiles
CREATE POLICY "Users can view profiles in their org"
  ON profiles FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Skills
CREATE POLICY "Users can view non-hidden skills in their org"
  ON skills FOR SELECT
  USING (
    is_hidden = false
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners can view their own hidden skills"
  ON skills FOR SELECT
  USING (
    owner_id = auth.uid()
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create skills in their org"
  ON skills FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

CREATE POLICY "Owners can update their own skills"
  ON skills FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

-- Feedback
CREATE POLICY "Users can view feedback in their org"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = feedback.skill_id
      AND skills.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can submit feedback for skills in their org"
  ON feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = feedback.skill_id
      AND skills.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Copy Events
CREATE POLICY "Users can view copy events in their org"
  ON copy_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = copy_events.skill_id
      AND skills.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can log copy events for skills in their org"
  ON copy_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = copy_events.skill_id
      AND skills.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Skill Versions
CREATE POLICY "Users can view versions of skills in their org"
  ON skill_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = skill_versions.skill_id
      AND skills.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Skill owners can insert versions"
  ON skill_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = skill_versions.skill_id
      AND skills.owner_id = auth.uid()
    )
  );

-- ============================================
-- 6. Organization assignment function
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain text;
  org_id uuid;
  blocked_domains text[] := ARRAY[
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
    'yandex.com', 'zoho.com', 'gmx.com', 'live.com',
    'msn.com', 'me.com', 'mac.com'
  ];
BEGIN
  email_domain := split_part(NEW.email, '@', 2);

  IF email_domain = ANY(blocked_domains) THEN
    RAISE EXCEPTION 'Please use your corporate email address. Personal email domains (%, etc.) are not allowed.', email_domain;
  END IF;

  INSERT INTO organizations (name, domain)
  VALUES (email_domain, email_domain)
  ON CONFLICT (domain) DO NOTHING;

  SELECT id INTO org_id FROM organizations WHERE domain = email_domain;

  INSERT INTO profiles (id, email, full_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    org_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 7. Views
-- ============================================

CREATE OR REPLACE VIEW skills_with_stats AS
SELECT
  s.*,
  COALESCE(f.feedback_count, 0) AS feedback_count,
  f.avg_rating,
  COALESCE(c.use_count, 0) AS use_count,
  f.success_rate
FROM skills s
LEFT JOIN (
  SELECT
    skill_id,
    COUNT(*) AS feedback_count,
    AVG(rating) AS avg_rating,
    COUNT(*) FILTER (WHERE outcome = 'success')::float / NULLIF(COUNT(*), 0) AS success_rate
  FROM feedback
  GROUP BY skill_id
) f ON f.skill_id = s.id
LEFT JOIN (
  SELECT skill_id, COUNT(*) AS use_count
  FROM copy_events
  GROUP BY skill_id
) c ON c.skill_id = s.id;
