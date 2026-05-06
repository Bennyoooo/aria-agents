import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".aria");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface AriaConfig {
  api_key: string;
  server_url: string;
}

export function getConfig(): AriaConfig | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: AriaConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function apiCall(
  path: string,
  method: string = "GET",
  body?: unknown
): Promise<unknown> {
  const config = getConfig();
  if (!config) {
    throw new Error("Not logged in. Run: aria login");
  }

  // Try the Next.js API first, fall back to Supabase REST directly
  const url = `${config.server_url}${path}`;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return response.json();
    }
  } catch {
    // Next.js API unreachable, fall through to Supabase direct
  }

  // Direct Supabase REST fallback
  return supabaseRest(path, method, body, config);
}

export async function resolvePackage(
  type: PackageType,
  name: string,
  version?: string
): Promise<ResolvedPackage> {
  return (await apiCall("/api/packages/resolve", "POST", {
    type,
    name,
    version,
  })) as ResolvedPackage;
}

export async function getPackageDownload(
  versionId: string
): Promise<PackageDownload> {
  return (await apiCall(`/api/packages/versions/${versionId}/download`)) as PackageDownload;
}

async function supabaseRest(
  path: string,
  method: string,
  body: unknown,
  config: AriaConfig
): Promise<unknown> {
  const supabaseUrl = config.supabase_url;
  const serviceKey = config.service_key;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase not configured. Run: aria login --api-key <key> --server <url> --supabase-url <url> --service-key <key>");
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Resolve org from API key
  const orgs = curlFetch(
    `${supabaseUrl}/rest/v1/organizations?select=id,name,domain&api_key=eq.${config.api_key}`,
    headers
  ) as Array<{ id: string }>;
  if (!Array.isArray(orgs) || orgs.length === 0) {
    throw new Error("Invalid API key");
  }
  const orgId = orgs[0].id;

  if (path === "/api/skills" && method === "GET") {
    const skills = curlFetch(
      `${supabaseUrl}/rest/v1/skills_with_stats?organization_id=eq.${orgId}&is_hidden=eq.false&order=created_at.desc&limit=100&select=id,title,description,skill_type,agent_compatibility,function_team,tags,avg_rating,use_count,feedback_count`,
      headers
    );
    return { skills, total: (skills as unknown[]).length };
  }

  if (path === "/api/skills/search" && method === "POST") {
    const { query, filters } = body as { query?: string; filters?: Record<string, string> };
    let url = `${supabaseUrl}/rest/v1/skills_with_stats?organization_id=eq.${orgId}&is_hidden=eq.false&order=use_count.desc&limit=10&select=id,title,description,skill_type,agent_compatibility,function_team,tags,avg_rating,use_count,feedback_count`;
    if (query) url += `&or=(title.ilike.%25${query}%25,description.ilike.%25${query}%25)`;
    if (filters?.skill_type) url += `&skill_type=eq.${filters.skill_type}`;
    const skills = curlFetch(url, headers);
    return { skills };
  }

  if (path.match(/^\/api\/skills\/[^/]+$/) && method === "GET") {
    const id = path.split("/").pop();
    const skills = curlFetch(
      `${supabaseUrl}/rest/v1/skills_with_stats?id=eq.${id}&select=*`,
      headers
    ) as unknown[];
    if (!Array.isArray(skills) || skills.length === 0) throw new Error("Skill not found");
    const skill = skills[0] as Record<string, unknown>;
    const fb = curlFetch(
      `${supabaseUrl}/rest/v1/feedback?skill_id=eq.${id}&select=outcome,notes&order=created_at.desc&limit=5`,
      headers
    ) as Array<{ outcome: string; notes: string }>;
    return {
      ...skill,
      feedback_summary: {
        success_rate: skill.success_rate,
        avg_rating: skill.avg_rating,
        total_uses: skill.use_count,
        total_feedback: skill.feedback_count,
        recent_notes: (fb || []).filter((f) => f.notes).map((f) => f.notes),
      },
    };
  }

  if (path.match(/\/invoke$/) && method === "POST") {
    const id = path.split("/")[3];
    const skills = curlFetch(
      `${supabaseUrl}/rest/v1/skills?id=eq.${id}&select=instructions,tips`,
      headers
    ) as unknown[];
    if (!Array.isArray(skills) || skills.length === 0) throw new Error("Skill not found");
    return skills[0];
  }

  throw new Error(`Unsupported path: ${path}`);
}

function curlFetch(url: string, headers: Record<string, string>): unknown {
  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ");
  const result = execSync(`curl -s ${headerArgs} "${url}"`, {
    encoding: "utf-8",
    timeout: 10000,
  });
  return JSON.parse(result);
}

interface AriaConfig {
  api_key: string;
  server_url: string;
  supabase_url?: string;
  service_key?: string;
}

export interface RegistrySkill {
  id: string;
  title: string;
  description: string;
  skill_type: "skill" | "mcp" | "agent" | "plugin";
  instructions: string;
  agent_compatibility: string[];
  function_team: string;
  tags: string[];
  tips: string | null;
  avg_rating: number | null;
  use_count: number;
  feedback_count: number;
}

export type PackageType = "skill" | "mcp" | "agent" | "plugin";

export interface ResolvedPackage {
  package: {
    id: string;
    namespace: string;
    slug: string;
    name: string;
    description: string;
    package_type: PackageType;
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

export interface PackageDownload {
  package: {
    id: string;
    namespace: string;
    slug: string;
    name: string;
    package_type: PackageType;
  };
  version: {
    id: string;
    version: string;
    archive_hash: string | null;
    content_hash: string | null;
    size_bytes: number | null;
  };
  download_url: string;
  expires_in: number;
}
