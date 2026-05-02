CREATE TABLE IF NOT EXISTS gmail_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  email           text NOT NULL,
  access_token    text NOT NULL,
  refresh_token   text,
  token_expiry    timestamptz,
  scan_labels     text[] DEFAULT '{INBOX}',
  is_active       boolean DEFAULT true,
  connected_by    uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, email)
);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gmail connections in their org" ON gmail_connections;
CREATE POLICY "Users can view gmail connections in their org"
  ON gmail_connections FOR SELECT
  USING (organization_id = get_user_org_id());
