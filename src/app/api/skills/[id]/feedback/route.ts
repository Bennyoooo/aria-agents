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
  const { outcome, rating, notes, agent_name } = body as {
    outcome: "success" | "failure" | "partial";
    rating?: number;
    notes?: string;
    agent_name?: string;
  };

  if (!["success", "failure", "partial"].includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome. Must be success, failure, or partial." }, { status: 400 });
  }

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify skill belongs to the org
  const { data: skill } = await supabase
    .from("skills")
    .select("id")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const { error } = await supabase.from("feedback").insert({
    skill_id: id,
    user_id: null,
    source: "agent",
    outcome,
    rating: rating || null,
    notes: notes || null,
    agent_name: agent_name || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logged: true });
}
