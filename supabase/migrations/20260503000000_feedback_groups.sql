-- Feedback groups: deduplicated feedback buckets per skill
-- When a non-positive group hits the threshold, auto-revision fires
CREATE TABLE IF NOT EXISTS feedback_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id        uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  summary         text NOT NULL,
  sentiment       text NOT NULL CHECK (sentiment IN ('positive', 'negative', 'revision')),
  count           integer NOT NULL DEFAULT 1,
  sample_notes    text[] DEFAULT '{}',
  auto_revision_triggered boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE feedback_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view feedback groups in their org" ON feedback_groups;
CREATE POLICY "Users can view feedback groups in their org"
  ON feedback_groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM skills WHERE skills.id = feedback_groups.skill_id
    AND skills.organization_id = get_user_org_id()
  ));

-- Add star_count to skills for aggregated positive feedback
ALTER TABLE skills ADD COLUMN IF NOT EXISTS star_count integer DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS total_feedback_count integer DEFAULT 0;

-- Recreate view
DROP VIEW IF EXISTS skills_with_stats;
CREATE VIEW skills_with_stats AS
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
