-- Safe to re-run: IF NOT EXISTS on columns, DROP IF EXISTS on view
ALTER TABLE skills ADD COLUMN IF NOT EXISTS install_command text;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS env_vars jsonb DEFAULT '[]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS tools_provided jsonb DEFAULT '[]';

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
