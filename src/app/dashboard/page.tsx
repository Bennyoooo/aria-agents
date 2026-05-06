"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, MessageSquare, TrendingUp, Zap, CheckCircle, XCircle, AlertCircle, Bot, User } from "lucide-react";

interface SkillStat {
  id: string;
  title: string;
  skill_type: string;
  use_count: number;
  avg_rating: number | null;
  feedback_count: number;
  success_rate: number | null;
}

type RecentFeedback = {
  id: string;
  outcome: string;
  notes: string | null;
  source: string;
  agent_name: string | null;
  created_at: string;
  skills: { id: string; title: string } | null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalSkills, setTotalSkills] = useState(0);
  const [totalUses, setTotalUses] = useState(0);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [successRate, setSuccessRate] = useState<string>("—");
  const [topSkills, setTopSkills] = useState<SkillStat[]>([]);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Total skills
      const { count: skillCount } = await supabase
        .from("skills")
        .select("*", { count: "exact", head: true })
        .eq("is_hidden", false);
      setTotalSkills(skillCount || 0);

      // Total uses
      const { count: useCount } = await supabase
        .from("copy_events")
        .select("*", { count: "exact", head: true });
      setTotalUses(useCount || 0);

      // Total feedback + success rate
      const { data: allFeedback } = await supabase
        .from("feedback")
        .select("outcome");
      const fbCount = allFeedback?.length || 0;
      setTotalFeedback(fbCount);
      if (fbCount > 0) {
        const successes = allFeedback!.filter(f => f.outcome === "success").length;
        setSuccessRate(`${Math.round((successes / fbCount) * 100)}%`);
      }

      // Top skills
      const { data: top } = await supabase
        .from("skills_with_stats")
        .select("id, title, skill_type, use_count, avg_rating, feedback_count, success_rate")
        .eq("is_hidden", false)
        .order("use_count", { ascending: false })
        .limit(10);
      setTopSkills((top as SkillStat[]) || []);

      // Team breakdown
      const { data: teamData } = await supabase
        .from("skills")
        .select("function_team")
        .eq("is_hidden", false);
      const counts: Record<string, number> = {};
      teamData?.forEach(s => { counts[s.function_team] = (counts[s.function_team] || 0) + 1; });
      setTeamCounts(counts);

      // Recent feedback
      const { data: recent } = await supabase
        .from("feedback")
        .select("id, outcome, notes, source, agent_name, created_at, skills(id, title)")
        .order("created_at", { ascending: false })
        .limit(15);
      setRecentFeedback(((recent || []) as unknown as RecentFeedback[]).map((item) => ({
        ...item,
        skills: Array.isArray(item.skills) ? item.skills[0] ?? null : item.skills,
      })));

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">
          How your team shares and uses AI knowledge
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Items</span>
            </div>
            <p className="text-3xl font-bold mt-1">{totalSkills}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Uses</span>
            </div>
            <p className="text-3xl font-bold mt-1">{totalUses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-3xl font-bold mt-1">{successRate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Feedback</span>
            </div>
            <p className="text-3xl font-bold mt-1">{totalFeedback}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Most Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topSkills.map((skill, i) => (
                  <a key={skill.id} href={`/skills/${skill.id}`} className="flex items-center gap-3 hover:bg-accent/50 rounded-lg p-2 -mx-2 transition-colors">
                    <span className="text-sm font-mono text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{skill.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1">
                          {skill.skill_type === "mcp" ? "MCP" : skill.skill_type}
                        </Badge>
                        <span>{skill.use_count} uses</span>
                        {skill.avg_rating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {skill.avg_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By team */}
        <Card>
          <CardHeader>
            <CardTitle>By Team</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(teamCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(teamCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([team, count]) => (
                    <div key={team} className="flex items-center justify-between">
                      <span className="text-sm">{team}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(count / totalSkills) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet</p>
          ) : (
            <div className="space-y-3">
              {recentFeedback.map((f) => (
                <div key={f.id} className="flex gap-3 p-2 rounded-lg bg-muted/30">
                  <div className={`mt-0.5 ${
                    f.outcome === "success" ? "text-green-600" :
                    f.outcome === "partial" ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {f.outcome === "success" ? <CheckCircle className="h-4 w-4" /> :
                     f.outcome === "partial" ? <AlertCircle className="h-4 w-4" /> :
                     <XCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <a href={`/skills/${f.skills?.id}`} className="font-medium text-foreground hover:underline truncate">
                        {f.skills?.title}
                      </a>
                      <span className="flex items-center gap-1">
                        {f.source === "agent" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {f.source === "agent" ? f.agent_name || "Agent" : "Web"}
                      </span>
                      <span>{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    {f.notes && <p className="text-sm mt-1">{f.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
