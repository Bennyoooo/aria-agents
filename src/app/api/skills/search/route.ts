import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const { query, filters } = body as {
    query?: string;
    filters?: {
      skill_type?: string;
      agent_compatibility?: string;
      function_team?: string;
      tags?: string[];
    };
  };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let dbQuery = supabase
    .from("skills_with_stats")
    .select("id, title, description, skill_type, agent_compatibility, function_team, tags, avg_rating, use_count, feedback_count, success_rate")
    .eq("organization_id", org.id)
    .eq("is_hidden", false);

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (filters?.skill_type) {
    dbQuery = dbQuery.eq("skill_type", filters.skill_type);
  }
  if (filters?.agent_compatibility) {
    dbQuery = dbQuery.contains("agent_compatibility", [filters.agent_compatibility]);
  }
  if (filters?.function_team) {
    dbQuery = dbQuery.eq("function_team", filters.function_team);
  }
  if (filters?.tags && filters.tags.length > 0) {
    dbQuery = dbQuery.overlaps("tags", filters.tags);
  }

  const { data: skills, error } = await dbQuery
    .order("use_count", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ skills: skills || [] });
}
