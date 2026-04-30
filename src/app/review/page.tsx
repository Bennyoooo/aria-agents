"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, Sparkles, MessageSquare, Clock } from "lucide-react";

interface SkillCandidate {
  id: string;
  source: string;
  source_channel: string;
  source_text: string;
  source_user: string;
  suggested_type: string;
  suggested_title: string;
  confidence: number;
  status: string;
  created_at: string;
}

export default function ReviewPage() {
  const [candidates, setCandidates] = useState<SkillCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    const supabase = createClient();
    const { data } = await supabase
      .from("skill_candidates")
      .select("*")
      .eq("status", "pending")
      .order("confidence", { ascending: false });
    setCandidates(data || []);
    setLoading(false);
  }

  async function handleApprove(candidate: SkillCandidate) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) return;

    const title = editingId === candidate.id ? editTitle : (candidate.suggested_title || "Untitled skill");
    const instructions = editingId === candidate.id ? editInstructions : candidate.source_text;
    const description = instructions.slice(0, 200).trim();

    // Create the skill
    const { data: skill, error } = await supabase
      .from("skills")
      .insert({
        title,
        description: description.length >= 50
          ? description
          : description + " (extracted from Slack by Aria)",
        instructions,
        skill_type: candidate.suggested_type || "prompt",
        agent_compatibility: ["claude_code", "chatgpt"],
        function_team: "General",
        organization_id: profile.organization_id,
        owner_id: user.id,
        tags: ["from-slack", "auto-extracted"],
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    // Update candidate status
    await supabase
      .from("skill_candidates")
      .update({
        status: "published",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        published_skill_id: skill?.id,
      })
      .eq("id", candidate.id);

    toast.success("Skill published to your playbook!");
    setCandidates(prev => prev.filter(c => c.id !== candidate.id));
    setEditingId(null);
  }

  async function handleReject(candidateId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("skill_candidates")
      .update({
        status: "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    toast("Dismissed");
    setCandidates(prev => prev.filter(c => c.id !== candidateId));
  }

  function startEditing(candidate: SkillCandidate) {
    setEditingId(candidate.id);
    setEditTitle(candidate.suggested_title || "");
    setEditInstructions(candidate.source_text);
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Review Suggestions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aria found these skill-worthy messages in your team's conversations. Approve to add them to your playbook.
        </p>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No pending suggestions. Aria will surface new ones as your team shares prompts and workflows.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    {editingId === candidate.id ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="font-semibold"
                      />
                    ) : (
                      <CardTitle className="text-base">
                        {candidate.suggested_title || "Untitled suggestion"}
                      </CardTitle>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        {candidate.suggested_type}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        from Slack
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          candidate.confidence >= 0.7
                            ? "text-green-600 border-green-300"
                            : candidate.confidence >= 0.5
                            ? "text-yellow-600 border-yellow-300"
                            : "text-muted-foreground"
                        }`}
                      >
                        {Math.round(candidate.confidence * 100)}% match
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingId === candidate.id ? (
                  <div className="space-y-2">
                    <Label>Instructions</Label>
                    <Textarea
                      value={editInstructions}
                      onChange={(e) => setEditInstructions(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                ) : (
                  <pre className="text-sm bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {candidate.source_text}
                  </pre>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" onClick={() => handleApprove(candidate)}>
                    <Check className="mr-1 h-3 w-3" />
                    {editingId === candidate.id ? "Publish" : "Approve"}
                  </Button>
                  {editingId !== candidate.id && (
                    <Button size="sm" variant="outline" onClick={() => startEditing(candidate)}>
                      Edit first
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleReject(candidate.id)}>
                    <X className="mr-1 h-3 w-3" />
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
