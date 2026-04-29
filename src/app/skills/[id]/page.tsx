import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, Copy, MessageSquare, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { FeedbackForm } from "@/components/feedback-form";
import { SkillActions } from "@/components/skill-actions";
import { ForkButton } from "@/components/fork-button";
import { FeedbackList } from "@/components/feedback-list";
import type { Feedback, Skill } from "@/lib/supabase/types";

const AGENT_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  chatgpt: "ChatGPT",
  copilot: "Copilot",
  gemini: "Gemini",
  codex: "Codex",
  cursor: "Cursor",
  other: "Other",
};

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: skill } = await supabase
    .from("skills")
    .select("*, owner:profiles!owner_id(full_name, email, function_team, contributor_role)")
    .eq("id", id)
    .single() as { data: Skill & { owner: { full_name: string; email: string; function_team: string; contributor_role: string } } | null };

  if (!skill) return notFound();

  const { data: feedbackData } = await supabase
    .from("feedback")
    .select("*")
    .eq("skill_id", id)
    .order("created_at", { ascending: false })
    .limit(20) as { data: Feedback[] | null };

  const { count: useCount } = await supabase
    .from("copy_events")
    .select("*", { count: "exact", head: true })
    .eq("skill_id", id);

  const feedback = feedbackData || [];
  const totalFeedback = feedback.length;
  const successCount = feedback.filter((f) => f.outcome === "success").length;
  const failureCount = feedback.filter((f) => f.outcome === "failure").length;
  const partialCount = feedback.filter((f) => f.outcome === "partial").length;
  const avgRating = feedback.filter((f) => f.rating).length > 0
    ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter((f) => f.rating).length
    : null;
  const successRate = totalFeedback > 0 ? (successCount / totalFeedback) * 100 : null;

  const isOwner = user?.id === skill.owner_id;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{skill.skill_type.replace("_", " ")}</Badge>
            <Badge variant={skill.data_sensitivity === "confidential" ? "destructive" : "secondary"}>
              {skill.data_sensitivity}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{skill.title}</h1>
          <p className="text-muted-foreground">{skill.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>by {skill.owner?.full_name || skill.owner?.email}</span>
            <span>·</span>
            <span>{skill.function_team}</span>
            <span>·</span>
            <span>{new Date(skill.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!isOwner && <ForkButton skill={skill} />}
          {isOwner && <SkillActions skillId={skill.id} isHidden={skill.is_hidden} />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold">
              {avgRating ? avgRating.toFixed(1) : "—"}
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Copy className="h-5 w-5" />
              {useCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total Uses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">
              {successRate != null ? `${successRate.toFixed(0)}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <MessageSquare className="h-5 w-5" />
              {totalFeedback}
            </div>
            <p className="text-xs text-muted-foreground">Feedback</p>
          </CardContent>
        </Card>
      </div>

      {/* Outcome breakdown */}
      {totalFeedback > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle className="h-4 w-4" /> {successCount} success
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <AlertCircle className="h-4 w-4" /> {partialCount} partial
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="h-4 w-4" /> {failureCount} failure
          </span>
        </div>
      )}

      <Separator />

      {/* Instructions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Instructions</CardTitle>
          <CopyButton text={skill.instructions} skillId={skill.id} />
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/50 rounded-lg p-4 overflow-x-auto">
            {skill.instructions}
          </pre>
        </CardContent>
      </Card>

      {/* Tips */}
      {skill.tips && (
        <Card>
          <CardHeader>
            <CardTitle>Tips for Use</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{skill.tips}</p>
          </CardContent>
        </Card>
      )}

      {/* Agent Compatibility */}
      <Card>
        <CardHeader>
          <CardTitle>Compatible Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {skill.agent_compatibility.map((agent) => (
              <Badge key={agent} variant="secondary">
                {AGENT_LABELS[agent] || agent}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      {skill.tags && skill.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MCP Config */}
      <Card>
        <CardHeader>
          <CardTitle>Use in Claude Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add the Aria MCP server to your Claude Code config to search and invoke this skill directly from your agent.
          </p>
          <CopyButton
            text={JSON.stringify({
              mcpServers: {
                "aria-skills": {
                  command: "npx",
                  args: ["aria-skills"],
                  env: {
                    ARIA_API_KEY: "<your-org-api-key>",
                    ARIA_SERVER_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "<supabase-url>",
                  },
                },
              },
            }, null, 2)}
            skillId={skill.id}
            label="Copy MCP Config"
          />
          <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto">
{`// .claude/settings.json
{
  "mcpServers": {
    "aria-skills": {
      "command": "npx",
      "args": ["aria-skills"],
      "env": {
        "ARIA_API_KEY": "<your-org-api-key>",
        "ARIA_SERVER_URL": "${process.env.NEXT_PUBLIC_SUPABASE_URL || "<supabase-url>"}"
      }
    }
  }
}`}
          </pre>
        </CardContent>
      </Card>

      <Separator />

      {/* Leave Feedback */}
      <FeedbackForm skillId={skill.id} />

      {/* Feedback List */}
      {feedback.length > 0 && <FeedbackList feedback={feedback} />}
    </div>
  );
}
