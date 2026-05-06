"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/copy-button";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Archive, Boxes, Download, ExternalLink, File, FileText, Folder, GitBranch, Lock, Package, Server, Shield } from "lucide-react";
import type { PackageDependency, PackageFile, PackageSummary, PackageVersion } from "@/lib/packages/types";

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  skill: { label: "Skill", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: FileText },
  mcp: { label: "MCP", color: "bg-green-500/10 text-green-600 border-green-200", icon: Server },
  agent: { label: "Agent", color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: Package },
  plugin: { label: "Plugin", color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: Boxes },
};

const AGENT_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  opencode: "OpenCode",
  chatgpt: "ChatGPT",
  copilot: "Copilot",
  gemini: "Gemini",
  codex: "Codex",
  cursor: "Cursor",
  other: "Other",
};

function formatBytes(value: number | null) {
  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function PackageDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pkg, setPkg] = useState<PackageSummary | null>(null);
  const [version, setVersion] = useState<PackageVersion | null>(null);
  const [versions, setVersions] = useState<PackageVersion[]>([]);
  const [files, setFiles] = useState<PackageFile[]>([]);
  const [skillMarkdown, setSkillMarkdown] = useState<string | null>(null);
  const [skillMarkdownError, setSkillMarkdownError] = useState<string | null>(null);
  const [skillMarkdownMode, setSkillMarkdownMode] = useState<"rendered" | "raw">("rendered");
  const [dependencies, setDependencies] = useState<PackageDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: packageData, error: packageError } = await supabase
        .from("packages")
        .select("*")
        .eq("id", id)
        .single();

      if (packageError || !packageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const typedPackage = packageData as PackageSummary;
      setPkg(typedPackage);

      const { data: versionData } = await supabase
        .from("package_versions")
        .select("*")
        .eq("package_id", id)
        .order("created_at", { ascending: false });

      const typedVersions = (versionData || []) as PackageVersion[];
      setVersions(typedVersions);

      const selectedVersion =
        typedVersions.find((item) => item.id === typedPackage.current_version_id) ||
        typedVersions.find((item) => item.status === "published") ||
        typedVersions[0] ||
        null;

      setVersion(selectedVersion);

      if (selectedVersion) {
        const [{ data: fileData }, { data: dependencyData }] = await Promise.all([
          supabase
            .from("package_files")
            .select("*")
            .eq("package_version_id", selectedVersion.id)
            .order("path", { ascending: true }),
          supabase
            .from("package_dependencies")
            .select("*")
            .eq("package_version_id", selectedVersion.id)
            .order("created_at", { ascending: true }),
        ]);

        setFiles((fileData || []) as PackageFile[]);
        setDependencies((dependencyData || []) as PackageDependency[]);

        const skillFile = ((fileData || []) as PackageFile[]).find((file) => file.path === "SKILL.md");
        if (skillFile) {
          const response = await fetch(`/api/packages/versions/${selectedVersion.id}/files?path=${encodeURIComponent(skillFile.path)}`);

          if (response.ok) {
            const file = await response.json() as { content: string };
            setSkillMarkdown(file.content);
          } else {
            const error = await response.json().catch(() => ({ error: "Could not read SKILL.md" }));
            setSkillMarkdownError(error.error || "Could not read SKILL.md");
          }
        }
      }

      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl space-y-4">
        <div className="h-8 w-72 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (notFound || !pkg) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold">Package not found</h1>
        <p className="text-muted-foreground mt-2">This package may be private, archived, or deleted.</p>
      </div>
    );
  }

  const config = TYPE_CONFIG[pkg.package_type] || TYPE_CONFIG.skill;
  const TypeIcon = config.icon;
  const installCommand = `aria install ${pkg.package_type} ${pkg.namespace}/${pkg.slug}${version ? `@${version.version}` : ""}`;
  const manifestObjectPath = version ? `${version.storage_prefix}${version.manifest_path}` : null;
  const archiveObjectPath = version?.archive_path ? `${version.storage_prefix}${version.archive_path}` : null;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={config.color}>
              <TypeIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
            <Badge variant={pkg.visibility === "public" ? "secondary" : "outline"}>
              {pkg.visibility === "public" ? "public" : "restricted"}
            </Badge>
            {version && <Badge variant="secondary">v{version.version}</Badge>}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{pkg.namespace}/{pkg.slug}</h1>
            <p className="text-muted-foreground mt-2">{pkg.description || pkg.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{pkg.name}</span>
            <span>·</span>
            <span>{new Date(pkg.updated_at).toLocaleDateString()}</span>
            {pkg.source_url && (
              <>
                <span>·</span>
                <a href={pkg.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                  <ExternalLink className="h-3 w-3" /> Source
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Archive className="h-5 w-5 text-muted-foreground" />
              {versions.length}
            </div>
            <p className="text-xs text-muted-foreground">Versions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <File className="h-5 w-5 text-muted-foreground" />
              {files.length}
            </div>
            <p className="text-xs text-muted-foreground">Files</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              {dependencies.length}
            </div>
            <p className="text-xs text-muted-foreground">References</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Shield className="h-5 w-5 text-muted-foreground" />
              {formatBytes(version?.size_bytes ?? null)}
            </div>
            <p className="text-xs text-muted-foreground">Archive Size</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={pkg.package_type === "skill" ? "skill" : "install"}>
        <TabsList>
          {pkg.package_type === "skill" && <TabsTrigger value="skill">SKILL.md</TabsTrigger>}
          <TabsTrigger value="install">Install</TabsTrigger>
          <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
          <TabsTrigger value="dependencies">References ({dependencies.length})</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {pkg.package_type === "skill" && (
          <TabsContent value="skill" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  SKILL.md
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSkillMarkdownMode("rendered")}
                    className={`rounded-md border px-3 py-1 text-xs ${skillMarkdownMode === "rendered" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  >
                    Rendered
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillMarkdownMode("raw")}
                    className={`rounded-md border px-3 py-1 text-xs ${skillMarkdownMode === "raw" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  >
                    Raw
                  </button>
                  {skillMarkdown && <CopyButton text={skillMarkdown} skillId={pkg.id} label="Copy" />}
                </div>
              </CardHeader>
              <CardContent>
                {skillMarkdown ? (
                  skillMarkdownMode === "rendered" ? (
                    <MarkdownPreview markdown={skillMarkdown} />
                  ) : (
                    <pre className="max-h-[680px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-sm">
                      {skillMarkdown}
                    </pre>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {skillMarkdownError || "No SKILL.md preview is available for this package version."}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="install" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Aria CLI
              </CardTitle>
              <CopyButton text={installCommand} skillId={pkg.id} label="Copy" />
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">{installCommand}</pre>
              <p className="text-xs text-muted-foreground">
                Downloads the package ZIP, validates `aria.json`, and installs through the compatible local agent adapters.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compatible Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pkg.agent_compatibility.length > 0 ? (
                  pkg.agent_compatibility.map((agent) => (
                    <Badge key={agent} variant="secondary">{AGENT_LABELS[agent] || agent}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No agent compatibility declared yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Package File Tree
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No indexed files for this package version yet.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  {files.map((file) => (
                    <div key={file.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center border-b last:border-b-0 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {file.file_type === "directory" ? <Folder className="h-4 w-4 text-muted-foreground" /> : <File className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-mono truncate">{file.path}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{file.role || file.file_type}</Badge>
                      <span className="text-xs text-muted-foreground">{formatBytes(file.size_bytes)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Referenced Packages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dependencies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No package references declared for this version.</p>
              ) : (
                <div className="space-y-2">
                  {dependencies.map((dependency) => (
                    <div key={dependency.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{dependency.dependency_type}</Badge>
                          <code className="text-sm truncate">{dependency.dependency_ref}</code>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {dependency.mode}{dependency.optional ? " · optional" : ""}{dependency.version_range ? ` · ${dependency.version_range}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {version ? (
                <>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="text-muted-foreground">Bucket</span>
                    <code>{version.storage_bucket}</code>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="text-muted-foreground">Prefix</span>
                    <code className="break-all">{version.storage_prefix}</code>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="text-muted-foreground">Manifest</span>
                    <code className="break-all">{manifestObjectPath}</code>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="text-muted-foreground">Archive</span>
                    <code className="break-all">{archiveObjectPath || "not available"}</code>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-3">
                    <span className="text-muted-foreground">Archive Hash</span>
                    <code className="break-all">{version.archive_hash || "not recorded"}</code>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No version metadata available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="outline">
                <Lock className="mr-1 h-3 w-3" />
                {pkg.visibility}
              </Badge>
              {pkg.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />
    </div>
  );
}
