-- Aria Knowledge Base — Full Schema (idempotent, safe to re-run)

CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  domain          text NOT NULL UNIQUE,
  api_key         text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  full_name       text,
  organization_id uuid REFERENCES organizations(id),
  function_team   text,
  contributor_role text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Skills
CREATE TABLE IF NOT EXISTS skills (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  owner_id        uuid NOT NULL REFERENCES profiles(id),
  title           text NOT NULL,
  description     text NOT NULL CHECK (char_length(description) >= 50),
  skill_type      text NOT NULL CHECK (skill_type IN ('skill', 'mcp', 'agent', 'plugin')),
  instructions    text NOT NULL,
  install_command text,
  source_url      text,
  files           jsonb DEFAULT '[]',
  env_vars        jsonb DEFAULT '[]',
  tools_provided  jsonb DEFAULT '[]',
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
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
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
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Copy events
CREATE TABLE IF NOT EXISTS copy_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id        uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id),
  source          text NOT NULL CHECK (source IN ('web', 'mcp')),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE copy_events ENABLE ROW LEVEL SECURITY;

-- Skill versions
CREATE TABLE IF NOT EXISTS skill_versions (
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
ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;

-- Skill candidates (from Slack bot)
CREATE TABLE IF NOT EXISTS skill_candidates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  source          text NOT NULL CHECK (source IN ('slack', 'email', 'agent', 'manual')),
  source_channel  text,
  source_message_ts text,
  source_user     text,
  source_text     text NOT NULL,
  suggested_type  text CHECK (suggested_type IN ('skill', 'mcp', 'agent', 'plugin')),
  suggested_title text,
  confidence      float NOT NULL DEFAULT 0,
  slack_team_id   text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  reviewed_by     uuid REFERENCES profiles(id),
  published_skill_id uuid REFERENCES skills(id),
  created_at      timestamptz DEFAULT now(),
  reviewed_at     timestamptz
);
ALTER TABLE skill_candidates ENABLE ROW LEVEL SECURITY;

-- Slack connections
CREATE TABLE IF NOT EXISTS slack_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  slack_team_id   text NOT NULL,
  slack_team_name text,
  bot_token       text NOT NULL,
  channels        text[] DEFAULT '{}',
  is_active       boolean DEFAULT true,
  connected_by    uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, slack_team_id)
);
ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;

-- Triggers
DROP TRIGGER IF EXISTS set_skills_updated_at ON skills;
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

DROP TRIGGER IF EXISTS auto_version_skill ON skills;
CREATE TRIGGER auto_version_skill
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION create_skill_version();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_forked_from ON skills(forked_from) WHERE forked_from IS NOT NULL;

-- Helper function to avoid RLS recursion
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS policies (drop and recreate to be idempotent)
DO $$ BEGIN
  -- Organizations
  DROP POLICY IF EXISTS "Users can view their own org" ON organizations;
  CREATE POLICY "Users can view their own org" ON organizations FOR SELECT
    USING (id = get_user_org_id());

  -- Profiles
  DROP POLICY IF EXISTS "Users can view profiles in their org" ON profiles;
  CREATE POLICY "Users can view profiles in their org" ON profiles FOR SELECT
    USING (organization_id = get_user_org_id());
  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

  -- Skills
  DROP POLICY IF EXISTS "Users can view non-hidden skills in their org" ON skills;
  CREATE POLICY "Users can view non-hidden skills in their org" ON skills FOR SELECT
    USING (is_hidden = false AND organization_id = get_user_org_id());
  DROP POLICY IF EXISTS "Owners can view their own hidden skills" ON skills;
  CREATE POLICY "Owners can view their own hidden skills" ON skills FOR SELECT
    USING (owner_id = auth.uid() AND organization_id = get_user_org_id());
  DROP POLICY IF EXISTS "Users can create skills in their org" ON skills;
  CREATE POLICY "Users can create skills in their org" ON skills FOR INSERT
    WITH CHECK (organization_id = get_user_org_id() AND owner_id = auth.uid());
  DROP POLICY IF EXISTS "Owners can update their own skills" ON skills;
  CREATE POLICY "Owners can update their own skills" ON skills FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (organization_id = get_user_org_id() AND owner_id = auth.uid());

  -- Feedback
  DROP POLICY IF EXISTS "Users can view feedback in their org" ON feedback;
  CREATE POLICY "Users can view feedback in their org" ON feedback FOR SELECT
    USING (EXISTS (SELECT 1 FROM skills WHERE skills.id = feedback.skill_id AND skills.organization_id = get_user_org_id()));
  DROP POLICY IF EXISTS "Users can submit feedback for skills in their org" ON feedback;
  CREATE POLICY "Users can submit feedback for skills in their org" ON feedback FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM skills WHERE skills.id = feedback.skill_id AND skills.organization_id = get_user_org_id()));

  -- Copy events
  DROP POLICY IF EXISTS "Users can view copy events in their org" ON copy_events;
  CREATE POLICY "Users can view copy events in their org" ON copy_events FOR SELECT
    USING (EXISTS (SELECT 1 FROM skills WHERE skills.id = copy_events.skill_id AND skills.organization_id = get_user_org_id()));
  DROP POLICY IF EXISTS "Users can log copy events for skills in their org" ON copy_events;
  CREATE POLICY "Users can log copy events for skills in their org" ON copy_events FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM skills WHERE skills.id = copy_events.skill_id AND skills.organization_id = get_user_org_id()));

  -- Skill versions
  DROP POLICY IF EXISTS "Users can view versions of skills in their org" ON skill_versions;
  CREATE POLICY "Users can view versions of skills in their org" ON skill_versions FOR SELECT
    USING (EXISTS (SELECT 1 FROM skills WHERE skills.id = skill_versions.skill_id AND skills.organization_id = get_user_org_id()));
  DROP POLICY IF EXISTS "Skill owners can insert versions" ON skill_versions;
  CREATE POLICY "Skill owners can insert versions" ON skill_versions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM skills WHERE skills.id = skill_versions.skill_id AND skills.owner_id = auth.uid()));

  -- Skill candidates
  DROP POLICY IF EXISTS "Users can view candidates in their org" ON skill_candidates;
  CREATE POLICY "Users can view candidates in their org" ON skill_candidates FOR SELECT
    USING (organization_id = get_user_org_id());
  DROP POLICY IF EXISTS "Users can update candidates in their org" ON skill_candidates;
  CREATE POLICY "Users can update candidates in their org" ON skill_candidates FOR UPDATE
    USING (organization_id = get_user_org_id());

  -- Slack connections
  DROP POLICY IF EXISTS "Users can view slack connections in their org" ON slack_connections;
  CREATE POLICY "Users can view slack connections in their org" ON slack_connections FOR SELECT
    USING (organization_id = get_user_org_id());
END $$;

-- Org assignment trigger
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
  email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  IF email_domain = '' OR email_domain IS NULL THEN RETURN NEW; END IF;
  IF email_domain = ANY(blocked_domains) THEN
    RAISE EXCEPTION 'Personal email domains are not allowed. Please use your corporate email.';
  END IF;
  INSERT INTO public.organizations (name, domain) VALUES (email_domain, email_domain) ON CONFLICT (domain) DO NOTHING;
  SELECT id INTO org_id FROM public.organizations WHERE domain = email_domain;
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)), org_id);
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN RETURN NEW;
  WHEN OTHERS THEN RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE; RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Stats view
CREATE OR REPLACE VIEW skills_with_stats AS
SELECT s.*,
  COALESCE(f.feedback_count, 0) AS feedback_count,
  f.avg_rating,
  COALESCE(c.use_count, 0) AS use_count,
  f.success_rate
FROM skills s
LEFT JOIN (
  SELECT skill_id, COUNT(*) AS feedback_count, AVG(rating) AS avg_rating,
    COUNT(*) FILTER (WHERE outcome = 'success')::float / NULLIF(COUNT(*), 0) AS success_rate
  FROM feedback GROUP BY skill_id
) f ON f.skill_id = s.id
LEFT JOIN (
  SELECT skill_id, COUNT(*) AS use_count FROM copy_events GROUP BY skill_id
) c ON c.skill_id = s.id;
