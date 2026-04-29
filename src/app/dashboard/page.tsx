import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Copy, MessageSquare, TrendingUp, Users, Zap, CheckCircle, XCircle, AlertCircle, Bot, User } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p>Not logged in</p>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return <p>No organization</p>;

  // Aggregate stats
  const { count: totalSkills } = await supabase
    .from("skills")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .eq("is_hidden", false);

  const { count: totalUses } = await supabase
    .from("copy_events")
    .select("*, skills!inner(organization_id)", { count: "exact", head: true })
    .eq("skills.organization_id", profile.organization_id);

  const { count: totalFeedback } = await supabase
    .from("feedback")
    .select("*, skills!inner(organization_id)", { count: "exact", head: true })
    .eq("skills.organization_id", profile.organization_id);

  const { data: feedbackStats } = await supabase
    .from("feedback")
    .select("outcome, skills!inner(organization_id)")
    .eq("skills.organization_id", profile.organization_id);

  const successCount = feedbackStats?.filter((f) => f.outcome === "success").length || 0;
  const totalFbCount = feedbackStats?.length || 0;
  const successRate = totalFbCount > 0 ? ((successCount / totalFbCount) * 100).toFixed(0) : "—";

  // Top skills by usage
  const { data: topSkills } = await supabase
    .from("skills_with_stats")
    .select("id, title, skill_type, use_count, avg_rating, feedback_count, success_rate")
    .eq("organization_id", profile.organization_id)
    .eq("is_hidden", false)
    .order("use_count", { ascending: false })
    .limit(10);

  // Skills with declining success (< 50% success rate and at least 3 feedback)
  const { data: needsAttention } = await supabase
    .from("skills_with_stats")
    .select("id, title, skill_type, success_rate, feedback_count")
    .eq("organization_id", profile.organization_id)
    .eq("is_hidden", false)
    .lt("success_rate", 0.5)
    .gte("feedback_count", 3)
    .order("success_rate", { ascending: true })
    .limit(5);

  // Recent feedback
  const { data: recentFeedback } = await supabase
    .from("feedback")
    .select("*, skills!inner(id, title, organization_id)")
    .eq("skills.organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(15);

  // Contributor breakdown by team
  const { data: teamBreakdown } = await supabase
    .from("skills")
    .select("function_team")
    .eq("organization_id", profile.organization_id)
    .eq("is_hidden", false);

  const teamCounts = (teamBreakdown || []).reduce<Record<string, number>>((acc, s) => {
    acc[s.function_team] = (acc[s.function_team] || 0) + 1;
    return acc;
  }, {});

  // MCP vs Web usage
  const { count: mcpUses } = await supabase
    .from("copy_events")
    .select("*, skills!inner(organization_id)", { count: "exact", head: true })
    .eq("skills.organization_id", profile.organization_id)
    .eq("source", "mcp");

  const { count: agentFeedback } = await supabase
    .from("feedback")
    .select("*, skills!inner(organization_id)", { count: "exact", head: true })
    .eq("skills.organization_id", profile.organization_id)
    .eq("source", "agent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Organization-wide skill marketplace analytics
        </p>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Skills</span>
            </div>
            <p className="text-3xl font-bold mt-1">{totalSkills || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Uses</span>
            </div>
            <p className="text-3xl font-bold mt-1">{totalUses || 0}</p>
            <p className="text-xs text-muted-foreground">{mcpUses || 0} via MCP</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-3xl font-bold mt-1">{successRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Feedback</span>
            </div>
            <p className="text-3xl font-bold mt-1">{totalFeedback || 0}</p>
            <p className="text-xs text-muted-foreground">{agentFeedback || 0} from agents</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Top Skills by Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!topSkills || topSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills yet</p>
            ) : (
              <div className="space-y-3">
                {topSkills.map((skill, i) => (
                  <a key={skill.id} href={`/skills/${skill.id}`} className="flex items-center gap-3 hover:bg-accent/50 rounded-lg p-2 -mx-2 transition-colors">
                    <span className="text-sm font-mono text-muted-foreground w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{skill.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1">{skill.skill_type}</Badge>
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

        {/* Team Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Skills by Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(teamCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills yet</p>
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
                            style={{ width: `${(count / (totalSkills || 1)) * 100}%` }}
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

      {/* Needs Attention */}
      {needsAttention && needsAttention.length > 0 && (
        <Card className="border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Skills with less than 50% success rate and 3+ feedback</p>
            <div className="space-y-2">
              {needsAttention.map((skill) => (
                <a key={skill.id} href={`/skills/${skill.id}`} className="flex items-center justify-between hover:bg-accent/50 rounded-lg p-2 -mx-2 transition-colors">
                  <span className="text-sm">{skill.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px]">
                      {((skill.success_rate || 0) * 100).toFixed(0)}% success
                    </Badge>
                    <span className="text-xs text-muted-foreground">{skill.feedback_count} feedback</span>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Feedback Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentFeedback || recentFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet</p>
          ) : (
            <div className="space-y-3">
              {recentFeedback.map((f) => (
                <div key={f.id} className="flex gap-3 p-2 rounded-lg bg-muted/30">
                  <div className={`mt-0.5 ${
                    f.outcome === "success" ? "text-green-400" :
                    f.outcome === "partial" ? "text-yellow-400" : "text-red-400"
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
