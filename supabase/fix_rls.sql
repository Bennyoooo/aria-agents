-- Fix infinite recursion in profiles RLS policy
-- The problem: profiles SELECT policy queries profiles to get org_id, which triggers the same policy

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view profiles in their org" ON profiles;

-- Replace with a non-recursive version using auth.users metadata or a security definer function

-- Create a helper function that bypasses RLS to get the current user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Recreate profiles policy using the helper function
CREATE POLICY "Users can view profiles in their org"
  ON profiles FOR SELECT
  USING (organization_id = get_user_org_id());

-- Fix organizations policy too (same issue)
DROP POLICY IF EXISTS "Users can view their own org" ON organizations;
CREATE POLICY "Users can view their own org"
  ON organizations FOR SELECT
  USING (id = get_user_org_id());

-- Fix skills policies
DROP POLICY IF EXISTS "Users can view non-hidden skills in their org" ON skills;
CREATE POLICY "Users can view non-hidden skills in their org"
  ON skills FOR SELECT
  USING (
    is_hidden = false
    AND organization_id = get_user_org_id()
  );

DROP POLICY IF EXISTS "Owners can view their own hidden skills" ON skills;
CREATE POLICY "Owners can view their own hidden skills"
  ON skills FOR SELECT
  USING (
    owner_id = auth.uid()
    AND organization_id = get_user_org_id()
  );

DROP POLICY IF EXISTS "Users can create skills in their org" ON skills;
CREATE POLICY "Users can create skills in their org"
  ON skills FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id()
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update their own skills" ON skills;
CREATE POLICY "Owners can update their own skills"
  ON skills FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (
    organization_id = get_user_org_id()
    AND owner_id = auth.uid()
  );

-- Fix feedback policies
DROP POLICY IF EXISTS "Users can view feedback in their org" ON feedback;
CREATE POLICY "Users can view feedback in their org"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = feedback.skill_id
      AND skills.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can submit feedback for skills in their org" ON feedback;
CREATE POLICY "Users can submit feedback for skills in their org"
  ON feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = feedback.skill_id
      AND skills.organization_id = get_user_org_id()
    )
  );

-- Fix copy_events policies
DROP POLICY IF EXISTS "Users can view copy events in their org" ON copy_events;
CREATE POLICY "Users can view copy events in their org"
  ON copy_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = copy_events.skill_id
      AND skills.organization_id = get_user_org_id()
    )
  );

DROP POLICY IF EXISTS "Users can log copy events for skills in their org" ON copy_events;
CREATE POLICY "Users can log copy events for skills in their org"
  ON copy_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = copy_events.skill_id
      AND skills.organization_id = get_user_org_id()
    )
  );

-- Fix skill_versions policies
DROP POLICY IF EXISTS "Users can view versions of skills in their org" ON skill_versions;
CREATE POLICY "Users can view versions of skills in their org"
  ON skill_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM skills
      WHERE skills.id = skill_versions.skill_id
      AND skills.organization_id = get_user_org_id()
    )
  );
