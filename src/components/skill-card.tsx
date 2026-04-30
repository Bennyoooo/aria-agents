import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star, Copy, MessageSquare } from "lucide-react";
import type { SkillWithStats } from "@/lib/supabase/types";

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

const TYPE_COLORS: Record<string, string> = {
  prompt: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  workflow: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  tool: "bg-green-500/10 text-green-400 border-green-500/20",
  context_pack: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function SkillCard({ skill }: { skill: SkillWithStats }) {
  const typeColor = TYPE_COLORS[skill.skill_type] || "";

  return (
    <Link href={`/skills/${skill.id}`}>
      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {skill.title}
            </h3>
            <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 ${typeColor}`}>
              {skill.skill_type.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {skill.description}
          </p>

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
