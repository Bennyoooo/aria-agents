import { parsePackageRef, type PackageType } from "./manifest";

// Supabase query builders are heavily generic and differ between generated and
// untyped clients. The resolver only needs the small `from()` surface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RegistrySupabaseClient = { from: (table: string) => any };

type PackageRow = ResolvedPackage["package"] & {
  current_version_id: string | null;
};

type PackageVersionRow = ResolvedPackage["version"] & {
  created_at: string;
};

type PackageDependencyRow = ResolvedPackage["dependencies"][number];

export interface ResolvedPackage {
  package: {
    id: string;
    namespace: string;
    slug: string;
    name: string;
    description: string;
    package_type: PackageType;
    visibility: "private" | "org" | "public";
    organization_id: string | null;
    agent_compatibility: string[];
    tags: string[];
  };
  version: {
    id: string;
    version: string;
    storage_bucket: string;
    storage_prefix: string;
    manifest_path: string;
    archive_path: string | null;
    archive_hash: string | null;
    content_hash: string | null;
    size_bytes: number | null;
  };
  dependencies: Array<{
    dependency_type: PackageType;
    dependency_ref: string;
    version_range: string | null;
    mode: "reference" | "embedded";
    optional: boolean;
  }>;
}

export async function resolvePackageVersion(
  supabase: RegistrySupabaseClient,
  orgId: string,
  type: PackageType,
  name: string,
  requestedVersion?: string,
): Promise<ResolvedPackage | { error: string; status: number }> {
  const parsed = parsePackageRef(name);
  const version = requestedVersion ?? parsed.version;

  let packageQuery = supabase
    .from("packages")
    .select("id, namespace, slug, name, description, package_type, visibility, organization_id, current_version_id, agent_compatibility, tags")
    .eq("package_type", type)
    .eq("slug", parsed.slug)
    .eq("is_archived", false);

  if (parsed.namespace) {
    packageQuery = packageQuery.eq("namespace", parsed.namespace);
  }

  const { data: packageRows, error: packageError } = await packageQuery;

  if (packageError) {
    return { error: packageError.message, status: 500 };
  }

  const packages = (packageRows ?? []) as PackageRow[];
  const visiblePackages = packages.filter((pkg) =>
    pkg.visibility === "public" || pkg.organization_id === orgId
  );

  if (visiblePackages.length === 0) {
    return { error: "Package not found", status: 404 };
  }

  if (!parsed.namespace && visiblePackages.length > 1) {
    return {
      error: "Package name is ambiguous. Use namespace/name.",
      status: 409,
    };
  }

  const pkg = visiblePackages[0];

  let versionQuery = supabase
    .from("package_versions")
    .select("id, version, storage_bucket, storage_prefix, manifest_path, archive_path, archive_hash, content_hash, size_bytes, created_at")
    .eq("package_id", pkg.id)
    .eq("status", "published");

  if (version) {
    versionQuery = versionQuery.eq("version", version);
  } else if (pkg.current_version_id) {
    versionQuery = versionQuery.eq("id", pkg.current_version_id);
  }

  const { data: versionRows, error: versionError } = await versionQuery
    .order("created_at", { ascending: false })
    .limit(1);

  if (versionError) {
    return { error: versionError.message, status: 500 };
  }

  const versions = (versionRows ?? []) as PackageVersionRow[];
  if (versions.length === 0) {
    return { error: "Package version not found", status: 404 };
  }

  const selectedVersion = versions[0];

  const { data: dependencyRows, error: dependenciesError } = await supabase
    .from("package_dependencies")
    .select("dependency_type, dependency_ref, version_range, mode, optional")
    .eq("package_version_id", selectedVersion.id);

  if (dependenciesError) {
    return { error: dependenciesError.message, status: 500 };
  }

  return {
    package: {
      id: pkg.id,
      namespace: pkg.namespace,
      slug: pkg.slug,
      name: pkg.name,
      description: pkg.description,
      package_type: pkg.package_type,
      visibility: pkg.visibility,
      organization_id: pkg.organization_id,
      agent_compatibility: pkg.agent_compatibility ?? [],
      tags: pkg.tags ?? [],
    },
    version: {
      id: selectedVersion.id,
      version: selectedVersion.version,
      storage_bucket: selectedVersion.storage_bucket,
      storage_prefix: selectedVersion.storage_prefix,
      manifest_path: selectedVersion.manifest_path,
      archive_path: selectedVersion.archive_path,
      archive_hash: selectedVersion.archive_hash,
      content_hash: selectedVersion.content_hash,
      size_bytes: selectedVersion.size_bytes,
    },
    dependencies: ((dependencyRows ?? []) as PackageDependencyRow[]).map((dependency) => ({
      dependency_type: dependency.dependency_type,
      dependency_ref: dependency.dependency_ref,
      version_range: dependency.version_range,
      mode: dependency.mode,
      optional: dependency.optional,
    })) as ResolvedPackage["dependencies"],
  };
}
