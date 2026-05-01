"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Copy, MessageSquare, CheckCircle, XCircle, AlertCircle, Terminal, FileText, Wrench, ExternalLink, Download } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { FeedbackForm } from "@/components/feedback-form";
import { SkillActions } from "@/components/skill-actions";
import { ForkButton } from "@/components/fork-button";
import { FeedbackList } from "@/components/feedback-list";
import type { Feedback, Skill, EnvVar, ToolProvided, SupportFile } from "@/lib/supabase/types";

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

export default function SkillDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [skill, setSkill] = useState<(Skill & { owner?: { full_name: string; email: string; function_team: string } }) | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [useCount, setUseCount] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: skillData, error } = await supabase
        .from("skills")
        .select("*, owner:profiles!owner_id(full_name, email, function_team)")
        .eq("id", id)
        .single();

      if (error || !skillData) { setNotFound(true); setLoading(false); return; }

      setSkill(skillData as typeof skill);
      setIsOwner(user?.id === skillData.owner_id);

      const { data: feedbackData } = await supabase
        .from("feedback").select("*").eq("skill_id", id)
        .order("created_at", { ascending: false }).limit(20);
      setFeedback(feedbackData || []);

      const { count } = await supabase
        .from("copy_events").select("*", { count: "exact", head: true }).eq("skill_id", id);
      setUseCount(count || 0);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="max-w-4xl space-y-4"><div className="h-8 w-64 bg-muted rounded animate-pulse" /><div className="h-48 bg-muted rounded-lg animate-pulse" /></div>;
  if (notFound || !skill) return <div className="text-center py-16"><h1 className="text-2xl font-bold">Not found</h1><p className="text-muted-foreground mt-2">This item may have been hidden or deleted.</p></div>;

  const totalFeedback = feedback.length;
  const successCount = feedback.filter(f => f.outcome === "success").length;
  const failureCount = feedback.filter(f => f.outcome === "failure").length;
  const partialCount = feedback.filter(f => f.outcome === "partial").length;
  const avgRating = feedback.filter(f => f.rating).length > 0
    ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length : null;
  const successRate = totalFeedback > 0 ? (successCount / totalFeedback) * 100 : null;
  const typeConfig = TYPE_CONFIG[skill.skill_type] || TYPE_CONFIG.skill;
  const envVars = (skill.env_vars || []) as EnvVar[];
  const tools = (skill.tools_provided || []) as ToolProvided[];
  const files = (skill.files || []) as SupportFile[];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={typeConfig.color}>{typeConfig.label}</Badge>
            <Badge variant={skill.data_sensitivity === "confidential" ? "destructive" : "secondary"}>
              {skill.data_sensitivity}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{skill.title}</h1>
          <p className="text-muted-foreground">{skill.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>by {skill.owner?.full_name || skill.owner?.email || "Unknown"}</span>
            <span>·</span>
            <span>{skill.function_team}</span>
            <span>·</span>
            <span>{new Date(skill.created_at).toLocaleDateString()}</span>
            {skill.source_url && (
              <>
                <span>·</span>
                <a href={skill.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                  <ExternalLink className="h-3 w-3" /> Source
                </a>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isOwner && <ForkButton skill={skill} />}
          {isOwner && <SkillActions skillId={skill.id} isHidden={skill.is_hidden} />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="flex items-center justify-center gap-1 text-2xl font-bold">{avgRating ? avgRating.toFixed(1) : "—"}<Star className="h-5 w-5 fill-yellow-500 text-yellow-500" /></div><p className="text-xs text-muted-foreground">Rating</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{useCount}</div><p className="text-xs text-muted-foreground">Uses</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{successRate != null ? `${successRate.toFixed(0)}%` : "—"}</div><p className="text-xs text-muted-foreground">Success</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{totalFeedback}</div><p className="text-xs text-muted-foreground">Feedback</p></CardContent></Card>
      </div>

      {totalFeedback > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> {successCount}</span>
          <span className="flex items-center gap-1 text-yellow-600"><AlertCircle className="h-4 w-4" /> {partialCount}</span>
          <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /> {failureCount}</span>
        </div>
      )}

      <Separator />

      {/* Type-specific content */}
      <Tabs defaultValue={skill.skill_type === "mcp" ? "install" : "instructions"}>
        <TabsList>
          {skill.skill_type === "mcp" && <TabsTrigger value="install">Install</TabsTrigger>}
          <TabsTrigger value="instructions">
            {skill.skill_type === "mcp" ? "About" : "SKILL.md"}
          </TabsTrigger>
          {tools.length > 0 && <TabsTrigger value="tools">Tools ({tools.length})</TabsTrigger>}
          {files.length > 0 && <TabsTrigger value="files">Files ({files.length})</TabsTrigger>}
          {envVars.length > 0 && <TabsTrigger value="env">Env Vars ({envVars.length})</TabsTrigger>}
        </TabsList>

        {/* Install tab (MCP only) */}
        {skill.skill_type === "mcp" && (
          <TabsContent value="install" className="space-y-4">
            {skill.install_command && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Quick Install</CardTitle>
                  <CopyButton text={skill.install_command} skillId={skill.id} label="Copy" />
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 rounded-lg p-4 font-mono text-sm">{skill.install_command}</pre>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Terminal className="h-4 w-4" /> Install via Aria CLI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="bg-muted/50 rounded-lg p-4 font-mono text-sm">aria install {skill.id}</pre>
                <p className="text-xs text-muted-foreground">
                  Installs into all detected agents (Claude Code, OpenCode, Cursor). Adds the MCP server config to each agent's settings.
                </p>
              </CardContent>
            </Card>

            {envVars.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Required Environment Variables</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {envVars.map(v => (
                      <div key={v.name} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                        <code className="font-mono text-sm font-medium shrink-0">{v.name}</code>
                        <span className="text-sm text-muted-foreground">{v.description}</span>
                        {v.required && <Badge variant="outline" className="shrink-0 text-[10px]">required</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Instructions / SKILL.md tab */}
        <TabsContent value="instructions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {skill.skill_type === "mcp" ? "Description" : "SKILL.md"}
              </CardTitle>
              <CopyButton text={skill.instructions} skillId={skill.id} />
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/50 rounded-lg p-4 overflow-x-auto">
                {skill.instructions}
              </pre>
            </CardContent>
          </Card>
          {skill.tips && (
            <Card className="mt-4">
              <CardHeader><CardTitle>Tips</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{skill.tips}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tools tab */}
        {tools.length > 0 && (
          <TabsContent value="tools">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Tools Provided</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tools.map(t => (
                    <div key={t.name} className="p-3 rounded-lg bg-muted/30">
                      <code className="font-mono text-sm font-medium">{t.name}</code>
                      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Files tab */}
        {files.length > 0 && (
          <TabsContent value="files">
            <div className="space-y-4">
              {files.map(f => (
                <Card key={f.path}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-mono">{f.path || f.name}</CardTitle>
                    <CopyButton text={f.content} skillId={skill.id} label="Copy" />
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap font-mono text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto">
                      {f.content}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Env vars tab */}
        {envVars.length > 0 && (
          <TabsContent value="env">
            <Card>
              <CardHeader><CardTitle>Environment Variables</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {envVars.map(v => (
                    <div key={v.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <code className="font-mono text-sm font-medium">{v.name}</code>
                        <p className="text-sm text-muted-foreground mt-0.5">{v.description}</p>
                      </div>
                      <Badge variant={v.required ? "default" : "outline"} className="text-[10px]">
                        {v.required ? "required" : "optional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Compatible Agents */}
      <Card>
        <CardHeader><CardTitle>Compatible Agents</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {skill.agent_compatibility.map(agent => (
              <Badge key={agent} variant="secondary">{AGENT_LABELS[agent] || agent}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      {skill.tags && skill.tags.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skill.tags.map(tag => (<Badge key={tag} variant="outline">{tag}</Badge>))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />
      <FeedbackForm skillId={skill.id} />
      {feedback.length > 0 && <FeedbackList feedback={feedback} />}
    </div>
  );
}
