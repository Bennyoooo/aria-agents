-- Skill candidates: potential skills extracted from Slack, email, or other sources
-- These are reviewed by humans before becoming real skills
CREATE TABLE skill_candidates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  source          text NOT NULL CHECK (source IN ('slack', 'email', 'agent', 'manual')),
  source_channel  text,
  source_message_ts text,
  source_user     text,
  source_text     text NOT NULL,
  suggested_type  text CHECK (suggested_type IN ('prompt', 'workflow', 'tool', 'context_pack')),
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

CREATE POLICY "Users can view candidates in their org"
  ON skill_candidates FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update candidates in their org"
  ON skill_candidates FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Slack workspace connections
CREATE TABLE slack_connections (
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

CREATE POLICY "Users can view slack connections in their org"
  ON slack_connections FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
