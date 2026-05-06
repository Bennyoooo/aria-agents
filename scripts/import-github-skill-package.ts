import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, join, relative } from "path";

type PackageType = "skill" | "mcp" | "agent" | "plugin";

interface GitTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface ImportOptions {
  owner: string;
  repo: string;
  ref: string;
  folder: string;
  namespace: string;
  slug: string;
  type: PackageType;
  version: string;
  agents: string[];
  tags: string[];
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const commitSha = await resolveCommitSha(options.owner, options.repo, options.ref);
  const version = options.version;
  const sourceUrl = `https://github.com/${options.owner}/${options.repo}/tree/${commitSha}/${options.folder}`;
  const workDir = join(tmpdir(), `aria-import-${options.slug}-${Date.now()}`);
  const packageDir = join(workDir, options.slug);

  mkdirSync(packageDir, { recursive: true });

  try {
    const tree = await fetchGitTree(options.owner, options.repo, commitSha);
    const entries = tree.filter((entry) => entry.path === options.folder || entry.path.startsWith(`${options.folder}/`));
    const files = entries.filter((entry) => entry.type === "blob");

    for (const file of files) {
      const relativePath = file.path.slice(options.folder.length + 1);
      const targetPath = join(packageDir, relativePath);
      mkdirSync(dirname(targetPath), { recursive: true });

      const rawUrl = `https://raw.githubusercontent.com/${options.owner}/${options.repo}/${commitSha}/${file.path}`;
      writeFileSync(targetPath, curlBuffer(rawUrl));
    }

    const skillMd = readFileSync(join(packageDir, "SKILL.md"), "utf-8");
    const frontmatter = parseFrontmatter(skillMd);
    const title = frontmatter.name || options.slug;
    const description = frontmatter.description || `Imported ${options.slug} skill package from ${sourceUrl}.`;

    const manifest = {
      schemaVersion: "1",
      type: options.type,
      name: options.slug,
      namespace: options.namespace,
      version,
      title,
      description,
      entrypoint: "SKILL.md",
      agents: options.agents,
      files: ["**/*"],
      dependencies: [],
      embedded: [],
      mcpServers: {},
      env: [],
      permissions: {
        filesystem: "project",
        network: false,
        runsScripts: false,
      },
      source: {
        type: "github",
        url: sourceUrl,
        commit: commitSha,
        path: options.folder,
      },
    };

    writeFileSync(join(packageDir, "aria.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    const archivePath = join(workDir, "package.zip");
    execFileSync("zip", ["-qr", archivePath, "."], { cwd: packageDir });

    const storagePrefix = `public/${options.namespace}/${options.slug}/versions/${version}/`;
    const archiveHash = `sha256:${sha256(readFileSync(archivePath))}`;
    const manifestHash = `sha256:${sha256(readFileSync(join(packageDir, "aria.json")))}`;

    await uploadDirectory(packageDir, `${storagePrefix}files/`);
    await uploadFile(archivePath, `${storagePrefix}package.zip`, "application/zip");

    const packageId = await upsertPackage({
      namespace: options.namespace,
      slug: options.slug,
      name: title,
      description,
      package_type: options.type,
      visibility: "public",
      source_url: sourceUrl,
      agent_compatibility: options.agents,
      tags: options.tags,
    });

    const versionId = await upsertPackageVersion({
      package_id: packageId,
      version,
      status: "published",
      storage_bucket: "aria-packages",
      storage_prefix: storagePrefix,
      manifest_path: "files/aria.json",
      archive_path: "package.zip",
      archive_hash: archiveHash,
      manifest_hash: manifestHash,
      content_hash: archiveHash,
      size_bytes: statSync(archivePath).size,
      changelog: `Mirrored ${sourceUrl}`,
      published_at: new Date().toISOString(),
    });

    restPatch("packages", `id=eq.${encodeURIComponent(packageId)}`, { current_version_id: versionId });
    await indexPackageFiles(versionId, packageDir);

    console.log(JSON.stringify({
      package_id: packageId,
      version_id: versionId,
      version,
      source_url: sourceUrl,
      storage_prefix: storagePrefix,
      files_indexed: listFiles(packageDir).length,
      archive_hash: archiveHash,
    }, null, 2));
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function parseArgs(args: string[]): ImportOptions {
  const value = (name: string, fallback?: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : fallback;
  };

  return {
    owner: value("owner", "anthropics")!,
    repo: value("repo", "skills")!,
    ref: value("ref", "main")!,
    folder: value("folder", "skills/pptx")!,
    namespace: value("namespace", "anthropic")!,
    slug: value("slug", "pptx")!,
    type: (value("type", "skill") || "skill") as PackageType,
    version: value("version", "1.0.0")!,
    tags: (value("tags") || `anthropic,${value("slug", "pptx")},skill`)
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
    agents: (value("agents", "claude_code,codex,cursor") || "")
      .split(",")
      .map((agent) => agent.trim())
      .filter(Boolean),
  };
}

function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals < 0) continue;
    const key = trimmed.slice(0, equals);
    const value = trimmed.slice(equals + 1);
    process.env[key] ??= value;
  }
}

async function resolveCommitSha(owner: string, repo: string, ref: string): Promise<string> {
  const data = curlJson(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${ref}`) as { object: { sha: string } };
  return data.object.sha;
}

async function fetchGitTree(owner: string, repo: string, sha: string): Promise<GitTreeEntry[]> {
  const data = curlJson(`https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`) as { tree: GitTreeEntry[] };
  return data.tree;
}

function parseFrontmatter(markdown: string): Record<string, string> {
  if (!markdown.startsWith("---\n")) return {};
  const end = markdown.indexOf("\n---", 4);
  if (end < 0) return {};

  const result: Record<string, string> = {};
  for (const line of markdown.slice(4, end).split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    result[key] = value;
  }
  return result;
}

async function uploadDirectory(directory: string, storagePrefix: string) {
  for (const file of listFiles(directory)) {
    const objectPath = `${storagePrefix}${relative(directory, file).replaceAll("\\", "/")}`;
    await uploadFile(file, objectPath, mimeType(file));
  }
}

async function uploadFile(filePath: string, objectPath: string, contentType: string) {
  curl([
    "-X", "POST",
    `${SUPABASE_URL}/storage/v1/object/aria-packages/${objectPath.split("/").map(encodeURIComponent).join("/")}`,
    "-H", `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", `Content-Type: ${contentType}`,
    "-H", "x-upsert: true",
    "--data-binary", `@${filePath}`,
  ]);
}

async function upsertPackage(data: Record<string, unknown>): Promise<string> {
  const existing = restGet("packages", [
    "select=id",
    "organization_id=is.null",
    `package_type=eq.${encodeURIComponent(String(data.package_type))}`,
    `namespace=eq.${encodeURIComponent(String(data.namespace))}`,
    `slug=eq.${encodeURIComponent(String(data.slug))}`,
  ]) as Array<{ id: string }>;

  if (existing[0]?.id) {
    restPatch("packages", `id=eq.${encodeURIComponent(existing[0].id)}`, data);
    return existing[0].id;
  }

  const inserted = restPost("packages", data) as Array<{ id: string }>;
  return inserted[0].id;
}

async function upsertPackageVersion(data: Record<string, unknown>): Promise<string> {
  const existing = restGet("package_versions", [
    "select=id",
    `package_id=eq.${encodeURIComponent(String(data.package_id))}`,
    `version=eq.${encodeURIComponent(String(data.version))}`,
  ]) as Array<{ id: string }>;

  if (existing[0]?.id) {
    restPatch("package_versions", `id=eq.${encodeURIComponent(existing[0].id)}`, data);
    return existing[0].id;
  }

  const inserted = restPost("package_versions", data) as Array<{ id: string }>;
  return inserted[0].id;
}

async function indexPackageFiles(versionId: string, packageDir: string) {
  restDelete("package_files", `package_version_id=eq.${encodeURIComponent(versionId)}`);

  const rows = listEntries(packageDir).map((entry) => {
    const stats = statSync(entry);
    const path = relative(packageDir, entry).replaceAll("\\", "/");
    const isDirectory = stats.isDirectory();

    return {
      package_version_id: versionId,
      path,
      file_type: isDirectory ? "directory" : "file",
      role: roleForPath(path, isDirectory),
      mime_type: isDirectory ? null : mimeType(entry),
      size_bytes: isDirectory ? null : stats.size,
      content_hash: isDirectory ? null : `sha256:${sha256(readFileSync(entry))}`,
      previewable: !isDirectory && isPreviewable(entry),
    };
  });

  restPost("package_files", rows);
}

function listEntries(directory: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    results.push(fullPath);
    if (statSync(fullPath).isDirectory()) {
      results.push(...listEntries(fullPath));
    }
  }
  return results;
}

function listFiles(directory: string): string[] {
  return listEntries(directory).filter((entry) => statSync(entry).isFile());
}

function roleForPath(path: string, isDirectory: boolean) {
  if (isDirectory) return "other";
  if (path === "aria.json") return "manifest";
  if (path === "SKILL.md") return "entrypoint";
  if (/readme\.md$/i.test(path)) return "readme";
  if (path.startsWith("scripts/")) return "script";
  if (path.startsWith("examples/")) return "example";
  if (path.startsWith("templates/")) return "template";
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(path)) return "asset";
  if (/\.(json|ya?ml|toml)$/i.test(path)) return "config";
  return "other";
}

function mimeType(filePath: string) {
  const name = basename(filePath).toLowerCase();
  if (name.endsWith(".md")) return "text/markdown";
  if (name.endsWith(".txt") || name.endsWith(".py") || name.endsWith(".xsd")) return "text/plain";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

function isPreviewable(filePath: string) {
  return /\.(md|txt|py|json|ya?ml|toml|xsd)$/i.test(filePath);
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function curl(args: string[]): Buffer {
  return execFileSync("curl", ["-sS", "--fail-with-body", ...args], {
    maxBuffer: 100 * 1024 * 1024,
  });
}

function curlBuffer(url: string): Buffer {
  return curl([url]);
}

function curlJson(url: string): unknown {
  return JSON.parse(curlBuffer(url).toString("utf-8"));
}

function restGet(table: string, query: string[]): unknown {
  return JSON.parse(curl([
    `${SUPABASE_URL}/rest/v1/${table}?${query.join("&")}`,
    "-H", `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  ]).toString("utf-8"));
}

function restPost(table: string, data: unknown): unknown {
  return JSON.parse(curl([
    "-X", "POST",
    `${SUPABASE_URL}/rest/v1/${table}?select=id`,
    "-H", `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", "Content-Type: application/json",
    "-H", "Prefer: return=representation",
    "--data-binary", JSON.stringify(data),
  ]).toString("utf-8"));
}

function restPatch(table: string, query: string, data: unknown): void {
  curl([
    "-X", "PATCH",
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    "-H", `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", "Content-Type: application/json",
    "-H", "Prefer: return=minimal",
    "--data-binary", JSON.stringify(data),
  ]);
}

function restDelete(table: string, query: string): void {
  curl([
    "-X", "DELETE",
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    "-H", `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "-H", "Prefer: return=minimal",
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
