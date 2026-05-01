import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star, Copy, MessageSquare, Terminal, Wrench } from "lucide-react";
import type { SkillWithStats, ToolProvided } from "@/lib/supabase/types";

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

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  skill: { label: "Skill", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  mcp: { label: "MCP", color: "bg-green-500/10 text-green-600 border-green-200" },
  agent: { label: "Agent", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  plugin: { label: "Plugin", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
};

export function SkillCard({ skill }: { skill: SkillWithStats }) {
  const config = TYPE_CONFIG[skill.skill_type] || TYPE_CONFIG.skill;
  const tools = (skill.tools_provided || []) as ToolProvided[];

  return (
    <Link href={`/skills/${skill.id}`}>
      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {skill.title}
            </h3>
            <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 ${config.color}`}>
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {skill.description}
          </p>

          {/* MCP: show install command + tool count */}
          {skill.skill_type === "mcp" && skill.install_command && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 font-mono">
              <Terminal className="h-3 w-3 shrink-0" />
              <span className="truncate">{skill.install_command}</span>
            </div>
          )}

          {/* MCP: show tools provided */}
          {tools.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wrench className="h-3 w-3" />
              <span>{tools.length} tools: {tools.slice(0, 3).map(t => t.name).join(", ")}{tools.length > 3 ? "..." : ""}</span>
            </div>
          )}

          {/* Agent compatibility */}
          <div className="flex flex-wrap gap-1">
            {skill.agent_compatibility.slice(0, 3).map((agent) => (
              <Badge key={agent} variant="secondary" className="text-[10px] px-1.5 py-0">
                {AGENT_LABELS[agent] || agent}
              </Badge>
            ))}
            {skill.agent_compatibility.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{skill.agent_compatibility.length - 3}
              </Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {skill.avg_rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {skill.avg_rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Copy className="h-3 w-3" />
              {skill.use_count} uses
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {skill.feedback_count}
            </span>
          </div>

          {/* Team + tags */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{skill.function_team}</span>
            {skill.tags && skill.tags.length > 0 && (
              <>
                <span>·</span>
                <span className="truncate">{skill.tags.slice(0, 3).join(", ")}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
