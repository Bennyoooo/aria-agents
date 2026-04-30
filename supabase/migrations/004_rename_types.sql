-- Migrate skill types: prompt/workflow → skill, tool → mcp, context_pack → skill
-- Add new types: agent, plugin

-- Update existing data first
UPDATE skills SET skill_type = 'skill' WHERE skill_type IN ('prompt', 'workflow', 'context_pack');
UPDATE skills SET skill_type = 'mcp' WHERE skill_type = 'tool';

-- Update the CHECK constraint
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_skill_type_check;
ALTER TABLE skills ADD CONSTRAINT skills_skill_type_check
  CHECK (skill_type IN ('skill', 'mcp', 'agent', 'plugin'));

-- Update skill_candidates too
UPDATE skill_candidates SET suggested_type = 'skill' WHERE suggested_type IN ('prompt', 'workflow', 'context_pack');
UPDATE skill_candidates SET suggested_type = 'mcp' WHERE suggested_type = 'tool';

ALTER TABLE skill_candidates DROP CONSTRAINT IF EXISTS skill_candidates_suggested_type_check;
ALTER TABLE skill_candidates ADD CONSTRAINT skill_candidates_suggested_type_check
  CHECK (suggested_type IN ('skill', 'mcp', 'agent', 'plugin'));

-- Recreate the view (references skill_type)
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
