import type { PackageType } from "./manifest";

export interface PackageSummary {
  id: string;
  organization_id: string | null;
  namespace: string;
  slug: string;
  name: string;
  description: string;
  package_type: PackageType;
  visibility: "private" | "org" | "public";
  owner_id: string | null;
  current_version_id: string | null;
  source_url: string | null;
  agent_compatibility: string[];
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageVersion {
  id: string;
  package_id: string;
  version: string;
  status: "draft" | "review" | "published" | "deprecated";
  storage_bucket: string;
  storage_prefix: string;
  manifest_path: string;
  archive_path: string | null;
  archive_hash: string | null;
  manifest_hash: string | null;
  content_hash: string | null;
  size_bytes: number | null;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

export interface PackageFile {
  id: string;
  package_version_id: string;
  path: string;
  file_type: "file" | "directory";
  role: "manifest" | "entrypoint" | "readme" | "asset" | "script" | "template" | "example" | "config" | "other" | null;
  mime_type: string | null;
  size_bytes: number | null;
  content_hash: string | null;
  previewable: boolean;
  created_at: string;
}

export interface PackageDependency {
  id: string;
  package_version_id: string;
  dependency_type: PackageType;
  dependency_ref: string;
  dependency_package_id: string | null;
  resolved_version_id: string | null;
  version_range: string | null;
  mode: "reference" | "embedded";
  optional: boolean;
  created_at: string;
}
