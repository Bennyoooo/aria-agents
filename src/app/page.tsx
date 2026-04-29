import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SkillCard } from "@/components/skill-card";
import { BrowseFilters } from "@/components/browse-filters";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const typeFilter = typeof params.type === "string" ? params.type : "";
  const agentFilter = typeof params.agent === "string" ? params.agent : "";
  const teamFilter = typeof params.team === "string" ? params.team : "";
  const sortBy = typeof params.sort === "string" ? params.sort : "newest";

  const supabase = await createServerSupabaseClient();

  let dbQuery = supabase
    .from("skills_with_stats")
    .select("*")
    .eq("is_hidden", false);

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (typeFilter) {
    dbQuery = dbQuery.eq("skill_type", typeFilter);
  }
  if (agentFilter) {
    dbQuery = dbQuery.contains("agent_compatibility", [agentFilter]);
  }
  if (teamFilter) {
    dbQuery = dbQuery.eq("function_team", teamFilter);
  }

  if (sortBy === "rating") {
    dbQuery = dbQuery.order("avg_rating", { ascending: false, nullsFirst: false });
  } else if (sortBy === "popular") {
    dbQuery = dbQuery.order("use_count", { ascending: false });
  } else {
    dbQuery = dbQuery.order("created_at", { ascending: false });
  }

  const { data: skills, error } = await dbQuery.limit(50);

  const { data: teams } = await supabase
    .from("skills")
    .select("function_team")
    .eq("is_hidden", false);

  const uniqueTeams = [...new Set(teams?.map((t) => t.function_team).filter(Boolean) || [])];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skill Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discover and use AI skills shared across your organization
          </p>
        </div>
        <Link href="/submit" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Skill
        </Link>
      </div>

      <BrowseFilters teams={uniqueTeams} />

      {error ? (
        <p className="text-destructive">Error loading skills: {error.message}</p>
      ) : !skills || skills.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground text-lg">
            {query || typeFilter || agentFilter || teamFilter
              ? "No skills match your filters"
              : "No skills yet. Be the first to share something your team uses."}
          </p>
          <Link href="/submit" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            Create the first skill
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
