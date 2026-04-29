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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: skill, error } = await supabase
    .from("skills")
    .select("id, instructions, tips")
    .eq("id", id)
    .eq("organization_id", org.id)
    .eq("is_hidden", false)
    .single();

  if (error || !skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Log the invocation
  await supabase.from("copy_events").insert({
    skill_id: id,
    user_id: null,
    source: "mcp",
  });

  return NextResponse.json({
    instructions: skill.instructions,
    tips: skill.tips,
  });
}
