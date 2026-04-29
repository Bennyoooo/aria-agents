import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const skillIds = request.nextUrl.searchParams.get("ids");

  let query = supabase
    .from("skills")
    .select("title, description, skill_type, instructions, agent_compatibility, function_team, tags, data_sensitivity, tips")
    .eq("organization_id", org.id)
    .eq("is_hidden", false);

  if (skillIds) {
    query = query.in("id", skillIds.split(","));
  }

  const { data: skills, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    version: "1.0",
    exported_at: new Date().toISOString(),
    organization: org.name,
    skills: skills || [],
  });
}
