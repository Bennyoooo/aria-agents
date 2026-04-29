import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const { skills, owner_id } = body as {
    skills: Array<{
      title: string;
      description: string;
      skill_type: string;
      instructions: string;
      agent_compatibility: string[];
      function_team: string;
      tags?: string[];
      data_sensitivity?: string;
      tips?: string;
    }>;
    owner_id: string;
  };

  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return NextResponse.json({ error: "No skills provided" }, { status: 400 });
  }

  if (!owner_id) {
    return NextResponse.json({ error: "owner_id is required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = [];
  for (const skill of skills) {
    const { data, error } = await supabase
      .from("skills")
      .insert({
        ...skill,
        organization_id: org.id,
        owner_id,
        tags: skill.tags || [],
        data_sensitivity: skill.data_sensitivity || "internal",
      })
      .select("id, title")
      .single();

    results.push({
      title: skill.title,
      imported: !error,
      id: data?.id || null,
      error: error?.message || null,
    });
  }

  const imported = results.filter((r) => r.imported).length;
  const failed = results.filter((r) => !r.imported).length;

  return NextResponse.json({
    imported,
    failed,
    results,
  });
}
