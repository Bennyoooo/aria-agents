"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SkillCard } from "@/components/skill-card";
import { BrowseFilters } from "@/components/browse-filters";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { SkillWithStats } from "@/lib/supabase/types";

function BrowseContent() {
  const searchParams = useSearchParams();
  const [skills, setSkills] = useState<SkillWithStats[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") || "";
  const typeFilter = searchParams.get("type") || "";
  const agentFilter = searchParams.get("agent") || "";
  const teamFilter = searchParams.get("team") || "";
  const sortBy = searchParams.get("sort") || "newest";

  useEffect(() => {
    async function fetchSkills() {
      setLoading(true);
      const supabase = createClient();

      let dbQuery = supabase
        .from("skills_with_stats")
        .select("*")
        .eq("is_hidden", false);

      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }
      if (typeFilter && typeFilter !== "__all__") {
        dbQuery = dbQuery.eq("skill_type", typeFilter);
      }
      if (agentFilter && agentFilter !== "__all__") {
        dbQuery = dbQuery.contains("agent_compatibility", [agentFilter]);
      }
      if (teamFilter && teamFilter !== "__all__") {
        dbQuery = dbQuery.eq("function_team", teamFilter);
      }

      if (sortBy === "rating") {
        dbQuery = dbQuery.order("avg_rating", { ascending: false, nullsFirst: false });
      } else if (sortBy === "popular") {
        dbQuery = dbQuery.order("use_count", { ascending: false });
      } else {
        dbQuery = dbQuery.order("created_at", { ascending: false });
      }

      const { data, error: fetchError } = await dbQuery.limit(50);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setSkills(data || []);
      }

      // Get teams for filter
      const { data: teamData } = await supabase
        .from("skills")
        .select("function_team")
        .eq("is_hidden", false);

      const uniqueTeams = [...new Set(teamData?.map((t) => t.function_team).filter(Boolean) || [])];
      setTeams(uniqueTeams);

      setLoading(false);
    }

    fetchSkills();
  }, [query, typeFilter, agentFilter, teamFilter, sortBy]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Playbook</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your team's shared AI skills, prompts, and workflows
          </p>
        </div>
        <Link href="/submit" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Skill
        </Link>
      </div>

      <BrowseFilters teams={teams} />

      {error ? (
        <p className="text-destructive">Error loading skills: {error}</p>
      ) : skills.length === 0 ? (
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

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseContent />
    </Suspense>
  );
}
