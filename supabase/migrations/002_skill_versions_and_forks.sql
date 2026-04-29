-- ============================================
-- Skill Versions (edit history)
-- ============================================
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

ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;

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

-- Add version tracking to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS current_version integer DEFAULT 1;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS forked_from uuid REFERENCES skills(id);

-- Function to auto-create version on skill update
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
-- Skill forks tracking index
-- ============================================
CREATE INDEX IF NOT EXISTS idx_skills_forked_from ON skills(forked_from) WHERE forked_from IS NOT NULL;
