-- Aria package distribution registry
-- Postgres indexes package metadata. Supabase Storage stores package files and ZIP artifacts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aria-packages',
  'aria-packages',
  false,
  104857600,
  ARRAY[
    'application/zip',
    'application/json',
    'text/markdown',
    'text/plain',
    'image/png',
    'image/jpeg',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS packages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid REFERENCES organizations(id),
  namespace          text NOT NULL,
  slug               text NOT NULL,
  name               text NOT NULL,
  description        text NOT NULL DEFAULT '',
  package_type       text NOT NULL CHECK (package_type IN ('skill', 'mcp', 'agent', 'plugin')),
  visibility         text NOT NULL DEFAULT 'org' CHECK (visibility IN ('private', 'org', 'public')),
  owner_id           uuid REFERENCES profiles(id),
  current_version_id uuid,
  source_url         text,
  agent_compatibility text[] NOT NULL DEFAULT '{}',
  tags               text[] NOT NULL DEFAULT '{}',
  is_archived        boolean NOT NULL DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_identity
  ON packages (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), package_type, namespace, slug);

CREATE INDEX IF NOT EXISTS idx_packages_type_slug ON packages(package_type, slug);
CREATE INDEX IF NOT EXISTS idx_packages_org ON packages(organization_id);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS package_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  version         text NOT NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'deprecated')),
  storage_bucket  text NOT NULL DEFAULT 'aria-packages',
  storage_prefix  text NOT NULL,
  manifest_path   text NOT NULL DEFAULT 'files/aria.json',
  archive_path    text,
  archive_hash    text,
  manifest_hash   text,
  content_hash    text,
  size_bytes      bigint,
  changelog       text,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  published_at    timestamptz,
  UNIQUE(package_id, version)
);

CREATE INDEX IF NOT EXISTS idx_package_versions_package ON package_versions(package_id);
CREATE INDEX IF NOT EXISTS idx_package_versions_status ON package_versions(status);

ALTER TABLE package_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'packages_current_version_id_fkey'
  ) THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_current_version_id_fkey
      FOREIGN KEY (current_version_id) REFERENCES package_versions(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS package_files (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_version_id uuid NOT NULL REFERENCES package_versions(id) ON DELETE CASCADE,
  path               text NOT NULL,
  file_type          text NOT NULL DEFAULT 'file' CHECK (file_type IN ('file', 'directory')),
  role               text CHECK (role IN ('manifest', 'entrypoint', 'readme', 'asset', 'script', 'template', 'example', 'config', 'other')),
  mime_type          text,
  size_bytes         bigint,
  content_hash       text,
  previewable        boolean NOT NULL DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  UNIQUE(package_version_id, path)
);

CREATE INDEX IF NOT EXISTS idx_package_files_version ON package_files(package_version_id);

ALTER TABLE package_files ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS package_dependencies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_version_id    uuid NOT NULL REFERENCES package_versions(id) ON DELETE CASCADE,
  dependency_type       text NOT NULL CHECK (dependency_type IN ('skill', 'mcp', 'agent', 'plugin')),
  dependency_ref        text NOT NULL,
  dependency_package_id uuid REFERENCES packages(id),
  resolved_version_id   uuid REFERENCES package_versions(id),
  version_range         text,
  mode                  text NOT NULL DEFAULT 'reference' CHECK (mode IN ('reference', 'embedded')),
  optional              boolean NOT NULL DEFAULT false,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_dependencies_version ON package_dependencies(package_version_id);

ALTER TABLE package_dependencies ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS package_install_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id         uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  package_version_id uuid REFERENCES package_versions(id),
  organization_id    uuid REFERENCES organizations(id),
  user_id            uuid REFERENCES profiles(id),
  agent              text,
  scope              text CHECK (scope IN ('global', 'project')),
  source             text NOT NULL DEFAULT 'cli' CHECK (source IN ('cli', 'web', 'mcp')),
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_install_events_package ON package_install_events(package_id);

ALTER TABLE package_install_events ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_packages_updated_at ON packages;
CREATE TRIGGER set_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view packages in their org or public" ON packages;
  CREATE POLICY "Users can view packages in their org or public" ON packages FOR SELECT
    USING (
      visibility = 'public'
      OR organization_id = get_user_org_id()
      OR owner_id = auth.uid()
    );

  DROP POLICY IF EXISTS "Users can create packages in their org" ON packages;
  CREATE POLICY "Users can create packages in their org" ON packages FOR INSERT
    WITH CHECK (organization_id = get_user_org_id() AND owner_id = auth.uid());

  DROP POLICY IF EXISTS "Owners can update their own packages" ON packages;
  CREATE POLICY "Owners can update their own packages" ON packages FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (organization_id = get_user_org_id() AND owner_id = auth.uid());

  DROP POLICY IF EXISTS "Users can view package versions they can see" ON package_versions;
  CREATE POLICY "Users can view package versions they can see" ON package_versions FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM packages
      WHERE packages.id = package_versions.package_id
      AND (
        packages.visibility = 'public'
        OR packages.organization_id = get_user_org_id()
        OR packages.owner_id = auth.uid()
      )
    ));

  DROP POLICY IF EXISTS "Users can view package files they can see" ON package_files;
  CREATE POLICY "Users can view package files they can see" ON package_files FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM package_versions
      JOIN packages ON packages.id = package_versions.package_id
      WHERE package_versions.id = package_files.package_version_id
      AND (
        packages.visibility = 'public'
        OR packages.organization_id = get_user_org_id()
        OR packages.owner_id = auth.uid()
      )
    ));

  DROP POLICY IF EXISTS "Users can view package dependencies they can see" ON package_dependencies;
  CREATE POLICY "Users can view package dependencies they can see" ON package_dependencies FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM package_versions
      JOIN packages ON packages.id = package_versions.package_id
      WHERE package_versions.id = package_dependencies.package_version_id
      AND (
        packages.visibility = 'public'
        OR packages.organization_id = get_user_org_id()
        OR packages.owner_id = auth.uid()
      )
    ));

  DROP POLICY IF EXISTS "Users can view install events in their org" ON package_install_events;
  CREATE POLICY "Users can view install events in their org" ON package_install_events FOR SELECT
    USING (organization_id = get_user_org_id());
END $$;
