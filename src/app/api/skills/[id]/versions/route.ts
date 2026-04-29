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

  // Verify skill belongs to org
  const { data: skill } = await supabase
    .from("skills")
    .select("id, current_version")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const { data: versions, error } = await supabase
    .from("skill_versions")
    .select("*")
    .eq("skill_id", id)
    .order("version_number", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    current_version: skill.current_version,
    versions: versions || [],
  });
}
