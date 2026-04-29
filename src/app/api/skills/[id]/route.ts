import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: skill, error } = await supabase
    .from("skills_with_stats")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .eq("is_hidden", false)
    .single();

  if (error || !skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Get recent feedback
  const { data: recentFeedback } = await supabase
    .from("feedback")
    .select("outcome, notes, created_at")
    .eq("skill_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    id: skill.id,
    title: skill.title,
    description: skill.description,
    instructions: skill.instructions,
    tips: skill.tips,
    skill_type: skill.skill_type,
    agent_compatibility: skill.agent_compatibility,
    function_team: skill.function_team,
    tags: skill.tags,
    feedback_summary: {
      success_rate: skill.success_rate,
      avg_rating: skill.avg_rating,
      total_uses: skill.use_count,
      total_feedback: skill.feedback_count,
      recent_notes: recentFeedback?.filter((f) => f.notes).map((f) => f.notes) || [],
    },
  });
}
