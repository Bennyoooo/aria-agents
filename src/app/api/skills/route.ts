import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    skill_type,
    instructions,
    agent_compatibility,
    function_team,
    owner_id,
    tags,
    data_sensitivity,
    tips,
  } = body;

  if (!title || !description || !skill_type || !instructions || !agent_compatibility || !function_team || !owner_id) {
    return NextResponse.json(
      { error: "Missing required fields: title, description, skill_type, instructions, agent_compatibility, function_team, owner_id" },
      { status: 400 }
    );
  }

  if (description.length < 50) {
    return NextResponse.json({ error: "Description must be at least 50 characters" }, { status: 400 });
  }

  const validTypes = ["prompt", "workflow", "tool", "context_pack"];
  if (!validTypes.includes(skill_type)) {
    return NextResponse.json({ error: `Invalid skill_type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: skill, error } = await supabase
    .from("skills")
    .insert({
      title,
      description,
      skill_type,
      instructions,
      agent_compatibility,
      function_team,
      owner_id,
      organization_id: org.id,
      tags: tags || [],
      data_sensitivity: data_sensitivity || "internal",
      tips: tips || null,
    })
    .select("id, title, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ skill }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: skills, error } = await supabase
    .from("skills_with_stats")
    .select("id, title, description, skill_type, agent_compatibility, function_team, tags, avg_rating, use_count, feedback_count, created_at")
    .eq("organization_id", org.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ skills: skills || [], total: skills?.length || 0 });
}
