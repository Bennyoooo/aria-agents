-- Redesign skills table to properly separate concerns
-- Skills = SKILL.md content (what the agent reads)
-- MCPs = install config + tool descriptions
-- All types can have support files and source repos

-- Add new columns
ALTER TABLE skills ADD COLUMN IF NOT EXISTS install_command text;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS env_vars jsonb DEFAULT '[]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS tools_provided jsonb DEFAULT '[]';

-- files schema: [{"name": "helper.py", "content": "...", "path": "scripts/helper.py"}]
-- env_vars schema: [{"name": "GITHUB_TOKEN", "required": true, "description": "GitHub personal access token with repo scope"}]
-- tools_provided schema: [{"name": "search_repositories", "description": "Search GitHub repos by query"}]

-- Recreate the view with new columns
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
