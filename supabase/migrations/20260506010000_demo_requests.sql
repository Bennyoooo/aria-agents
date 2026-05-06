-- Public interest form submissions.
-- Writes happen through /api/interest with the service role key; direct public
-- inserts stay disabled by RLS.

CREATE TABLE IF NOT EXISTS demo_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  business    text NOT NULL,
  role        text,
  team_size   text,
  platforms   text,
  message     text,
  source      text NOT NULL DEFAULT 'interest_page',
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
