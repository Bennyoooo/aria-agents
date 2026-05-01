"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Skill, SkillType, DataSensitivity } from "@/lib/supabase/types";

const SKILL_TYPES: { value: SkillType; label: string; description: string }[] = [
  { value: "skill", label: "Skill", description: "Instructions on how to perform a specific workflow. The recipe." },
  { value: "mcp", label: "MCP", description: "Connects AI to external tools and live data. The power tools." },
  { value: "agent", label: "Agent", description: "Autonomous persona that manages multi-step loops. The specialist." },
  { value: "plugin", label: "Plugin", description: "A bundle of Skills + MCPs + Agents distributed as one unit." },
];

const AGENTS = [
  { value: "claude_code", label: "Claude Code" },
  { value: "opencode", label: "OpenCode / OpenWork" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "copilot", label: "Copilot" },
  { value: "gemini", label: "Gemini" },
  { value: "codex", label: "Codex" },
  { value: "cursor", label: "Cursor" },
  { value: "other", label: "Other" },
];

const SENSITIVITY_LEVELS: { value: DataSensitivity; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
];

interface SkillFormProps {
  skill?: Skill;
  mode: "create" | "edit";
}

export function SkillForm({ skill, mode }: SkillFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(skill?.title ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [skillType, setSkillType] = useState<SkillType>(skill?.skill_type ?? "skill");
  const [instructions, setInstructions] = useState(skill?.instructions ?? "");
  const [installCommand, setInstallCommand] = useState(skill?.install_command ?? "");
  const [sourceUrl, setSourceUrl] = useState(skill?.source_url ?? "");
  const [agentCompat, setAgentCompat] = useState<string[]>(skill?.agent_compatibility ?? []);
  const [functionTeam, setFunctionTeam] = useState(skill?.function_team ?? "");
  const [tags, setTags] = useState(skill?.tags?.join(", ") ?? "");
  const [sensitivity, setSensitivity] = useState<DataSensitivity>(skill?.data_sensitivity ?? "internal");
  const [tips, setTips] = useState(skill?.tips ?? "");

  const toggleAgent = (agent: string) => {
    setAgentCompat((prev) =>
      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (description.length < 50) {
      toast.error("Description must be at least 50 characters");
      return;
    }
    if (agentCompat.length === 0) {
      toast.error("Select at least one compatible agent");
      return;
    }
    if (!instructions.trim()) {
      toast.error("Instructions are required");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, function_team")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      toast.error("No organization found. Please contact support.");
      setLoading(false);
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const skillData = {
      title,
      description,
      skill_type: skillType,
      instructions,
      install_command: installCommand || null,
      source_url: sourceUrl || null,
      agent_compatibility: agentCompat,
      function_team: functionTeam,
      tags: parsedTags,
      data_sensitivity: sensitivity,
      tips: tips || null,
      organization_id: profile.organization_id,
      owner_id: user.id,
    };

    if (mode === "create") {
      const { data, error } = await supabase
        .from("skills")
        .insert(skillData)
        .select("id")
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // Auto-populate profile function_team on first submission
      if (!profile.function_team && functionTeam) {
        await supabase
          .from("profiles")
          .update({ function_team: functionTeam })
          .eq("id", user.id);
      }

      toast.success("Skill published!");
      router.push(`/skills/${data.id}`);
    } else {
      const { error } = await supabase
        .from("skills")
        .update({
          title,
          description,
          instructions,
          install_command: installCommand || null,
          source_url: sourceUrl || null,
          agent_compatibility: agentCompat,
          function_team: functionTeam,
          tags: parsedTags,
          data_sensitivity: sensitivity,
          tips: tips || null,
        })
        .eq("id", skill!.id);

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      toast.success("Skill updated!");
      router.push(`/skills/${skill!.id}`);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create a New Skill" : "Edit Skill"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Code Review Checklist"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground text-xs">(min 50 chars, currently {description.length})</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this skill does and when to use it..."
              rows={3}
              required
            />
          </div>

          {/* Skill Type */}
          {mode === "create" && (
            <div className="space-y-3">
              <Label>Skill Type</Label>
              <RadioGroup
                value={skillType}
                onValueChange={(v) => setSkillType(v as SkillType)}
                className="grid grid-cols-2 gap-3"
              >
                {SKILL_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      skillType === type.value ? "border-primary bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    <RadioGroupItem value={type.value} className="mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Instructions / SKILL.md */}
          <div className="space-y-2">
            <Label htmlFor="instructions">
              {skillType === "mcp" ? "Description" : "SKILL.md Content"}
              <span className="text-muted-foreground text-xs ml-1">
                {skillType === "mcp"
                  ? "(what this MCP server does and how to use it)"
                  : "(the full instructions the agent reads and follows)"}
              </span>
            </Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={skillType === "mcp"
                ? "Describe what tools this MCP server provides and how to use them..."
                : "Write the SKILL.md content that gets injected into the agent's context..."}
              rows={10}
              className="font-mono text-sm"
              required
            />
          </div>

          {/* Install Command (MCP / Plugin) */}
          {(skillType === "mcp" || skillType === "plugin") && (
            <div className="space-y-2">
              <Label htmlFor="installCommand">
                Install Command <span className="text-muted-foreground text-xs">(how to install this MCP server)</span>
              </Label>
              <Input
                id="installCommand"
                value={installCommand}
                onChange={(e) => setInstallCommand(e.target.value)}
                placeholder="e.g., npx @modelcontextprotocol/server-github"
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">
              Source URL <span className="text-muted-foreground text-xs">(optional, link to GitHub repo or original source)</span>
            </Label>
            <Input
              id="sourceUrl"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="e.g., https://github.com/anthropics/skills/tree/main/skills/docx"
            />
          </div>

          {/* Agent Compatibility */}
          <div className="space-y-3">
            <Label>Compatible Agents</Label>
            <div className="flex flex-wrap gap-3">
              {AGENTS.map((agent) => (
                <label
                  key={agent.value}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    agentCompat.includes(agent.value) ? "border-primary bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <Checkbox
                    checked={agentCompat.includes(agent.value)}
                    onCheckedChange={() => toggleAgent(agent.value)}
                  />
                  <span className="text-sm">{agent.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Function/Team */}
          <div className="space-y-2">
            <Label htmlFor="team">Function / Team</Label>
            <Input
              id="team"
              value={functionTeam}
              onChange={(e) => setFunctionTeam(e.target.value)}
              placeholder="e.g., Engineering, Support, Legal, Product"
              required
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags <span className="text-muted-foreground text-xs">(comma-separated)</span>
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., code-review, testing, onboarding"
            />
          </div>

          {/* Data Sensitivity */}
          <div className="space-y-3">
            <Label>Data Sensitivity</Label>
            <RadioGroup
              value={sensitivity}
              onValueChange={(v) => setSensitivity(v as DataSensitivity)}
              className="flex gap-4"
            >
              {SENSITIVITY_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    sensitivity === level.value ? "border-primary bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <RadioGroupItem value={level.value} />
                  <span className="text-sm">{level.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <Label htmlFor="tips">
              Tips for Use <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="tips"
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              placeholder="Any tips for getting the best results..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Saving..." : mode === "create" ? "Publish Skill" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
