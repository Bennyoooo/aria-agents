import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const { owner_id } = body;

  if (!owner_id) {
    return NextResponse.json({ error: "owner_id is required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: original, error: fetchError } = await supabase
    .from("skills")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const { data: forked, error: insertError } = await supabase
    .from("skills")
    .insert({
      title: `${original.title} (fork)`,
      description: original.description,
      skill_type: original.skill_type,
      instructions: original.instructions,
      agent_compatibility: original.agent_compatibility,
      function_team: original.function_team,
      tags: original.tags,
      data_sensitivity: original.data_sensitivity,
      tips: original.tips,
      organization_id: org.id,
      owner_id,
      forked_from: id,
    })
    .select("id, title")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ skill: forked }, { status: 201 });
}
