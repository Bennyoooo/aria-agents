import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Archive, Boxes, Download, FileText, Globe2, Lock, Package } from "lucide-react";
import type { PackageSummary } from "@/lib/packages/types";

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

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  skill: { label: "Skill", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: FileText },
  mcp: { label: "MCP", color: "bg-green-500/10 text-green-600 border-green-200", icon: Download },
  agent: { label: "Agent", color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: Package },
  plugin: { label: "Plugin", color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: Boxes },
};

export function PackageCard({ pkg }: { pkg: PackageSummary }) {
  const config = TYPE_CONFIG[pkg.package_type] || TYPE_CONFIG.skill;
  const TypeIcon = config.icon;

  return (
    <Link href={`/packages/${pkg.id}`}>
      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors truncate">
                  {pkg.namespace}/{pkg.slug}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground truncate">{pkg.name}</p>
            </div>
            <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 ${config.color}`}>
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-3">
            {pkg.description || "No description provided."}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {pkg.visibility === "public" ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            <span>{pkg.visibility}</span>
            <span>·</span>
            <Archive className="h-3 w-3" />
            <span>{pkg.current_version_id ? "versioned" : "no published version"}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {pkg.agent_compatibility.slice(0, 3).map((agent) => (
              <Badge key={agent} variant="secondary" className="text-[10px] px-1.5 py-0">
                {AGENT_LABELS[agent] || agent}
              </Badge>
            ))}
            {pkg.agent_compatibility.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{pkg.agent_compatibility.length - 3}
              </Badge>
            )}
          </div>

          {pkg.tags.length > 0 && (
            <div className="text-xs text-muted-foreground truncate">
              {pkg.tags.slice(0, 4).join(", ")}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
