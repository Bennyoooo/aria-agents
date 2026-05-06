import AdmZip from "adm-zip";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, isAbsolute, join, normalize, relative, sep } from "path";
import type { PackageDownload, PackageType, ResolvedPackage } from "./api.js";
import { AgentConfig, installMcpToAgent, installPackageDirectoryToAgent } from "./agents.js";

export interface PackageManifest {
  schemaVersion?: string;
  type: PackageType;
  name: string;
  namespace?: string;
  version: string;
  title?: string;
  description?: string;
  entrypoint?: string;
  agents?: string[];
  files?: string[];
  dependencies?: Array<{
    type: PackageType;
    ref: string;
    mode?: "reference" | "embedded";
    optional?: boolean;
  }>;
  embedded?: Array<{
    type: PackageType;
    path: string;
  }>;
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  env?: Array<{
    name: string;
    required?: boolean;
    description?: string;
  }>;
  permissions?: {
    filesystem?: "none" | "project" | "user";
    network?: boolean;
    runsScripts?: boolean;
  };
}

export function parsePackageSpecifier(input: string): {
  name: string;
  version?: string;
} {
  const [name, version] = input.split("@", 2);
  return { name, version };
}

export function formatPackageRef(pkg: ResolvedPackage): string {
  return `${pkg.package.package_type}/${pkg.package.namespace}/${pkg.package.slug}@${pkg.version.version}`;
}

export async function downloadAndExtractPackage(
  download: PackageDownload,
): Promise<{ packageDir: string; manifest: PackageManifest }> {
  const workDir = join(
    tmpdir(),
    `aria-${download.package.slug}-${download.version.id}-${Date.now()}`,
  );
  mkdirSync(workDir, { recursive: true });

  const zipPath = join(workDir, "package.zip");
  const response = await fetch(download.download_url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(zipPath, buffer);

  verifyHash(buffer, download.version.archive_hash);

  const packageDir = join(workDir, "package");
  mkdirSync(packageDir, { recursive: true });
  extractZipSafely(zipPath, packageDir);

  const manifestPath = findManifest(packageDir);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as PackageManifest;

  if (!manifest.type || !manifest.name || !manifest.version) {
    throw new Error("aria.json must include type, name, and version");
  }

  return { packageDir: dirname(manifestPath), manifest };
}

export function installExtractedPackageToAgent(
  agent: AgentConfig,
  slug: string,
  packageDir: string,
  manifest: PackageManifest,
  scope: "user" | "project",
): string[] {
  const installedPaths: string[] = [];

  if (manifest.type === "mcp") {
    const servers = manifest.mcpServers || {};
    const entries = Object.entries(servers);
    if (entries.length === 0) {
      throw new Error("MCP package manifest does not declare mcpServers");
    }

    for (const [serverName, config] of entries) {
      installedPaths.push(installMcpToAgent(agent, serverName || slug, {
        command: config.command,
        args: config.args || [],
        env: config.env,
      }, scope));
    }
    return installedPaths;
  }

  installedPaths.push(installPackageDirectoryToAgent(agent, slug, packageDir, scope));

  const servers = manifest.mcpServers || {};
  for (const [serverName, config] of Object.entries(servers)) {
    installedPaths.push(installMcpToAgent(agent, serverName || `${slug}-mcp`, {
      command: config.command,
      args: config.args || [],
      env: config.env,
    }, scope));
  }

  return installedPaths;
}

export function cleanupExtractedPackage(packageDir: string): void {
  const workDir = dirname(packageDir);
  if (basename(packageDir) === "package" && existsSync(workDir)) {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function verifyHash(buffer: Buffer, expectedHash: string | null): void {
  if (!expectedHash) return;

  const [algorithm, expected] = expectedHash.includes(":")
    ? expectedHash.split(":", 2)
    : ["sha256", expectedHash];

  if (algorithm !== "sha256") {
    throw new Error(`Unsupported archive hash algorithm: ${algorithm}`);
  }

  const actual = createHash("sha256").update(buffer).digest("hex");
  if (actual !== expected) {
    throw new Error("Downloaded package hash did not match registry metadata");
  }
}

function extractZipSafely(zipPath: string, targetDir: string): void {
  const zip = new AdmZip(zipPath);

  for (const entry of zip.getEntries()) {
    if (!isSafePackagePath(entry.entryName)) {
      throw new Error(`Unsafe ZIP entry path: ${entry.entryName}`);
    }

    const entryName = normalize(entry.entryName);
    const outputPath = join(targetDir, entryName);
    const relativePath = relative(targetDir, outputPath);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new Error(`Unsafe ZIP entry path: ${entry.entryName}`);
    }
  }

  zip.extractAllTo(targetDir, true);
}

export function isSafePackagePath(path: string): boolean {
  const normalized = normalize(path);
  return !(
    isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith(`..${sep}`) ||
    normalized.split(sep).includes("..")
  );
}

function findManifest(packageDir: string): string {
  const rootManifest = join(packageDir, "aria.json");
  if (existsSync(rootManifest)) return rootManifest;

  const entries = new AdmZip(join(dirname(packageDir), "package.zip")).getEntries();
  const manifestEntry = entries.find((entry) => entry.entryName.endsWith("/aria.json"));
  if (!manifestEntry) {
    throw new Error("Package ZIP must contain aria.json");
  }

  const manifestPath = join(packageDir, normalize(manifestEntry.entryName));
  if (!existsSync(manifestPath)) {
    throw new Error("Package ZIP must contain aria.json");
  }

  return manifestPath;
}
