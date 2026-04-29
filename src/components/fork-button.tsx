"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GitFork } from "lucide-react";
import { toast } from "sonner";
import type { Skill } from "@/lib/supabase/types";

export function ForkButton({ skill }: { skill: Skill }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFork = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      toast.error("No organization found");
      setLoading(false);
      return;
    }

    const { data: forked, error } = await supabase
      .from("skills")
      .insert({
        title: `${skill.title} (fork)`,
        description: skill.description,
        skill_type: skill.skill_type,
        instructions: skill.instructions,
        agent_compatibility: skill.agent_compatibility,
        function_team: skill.function_team,
        tags: skill.tags,
        data_sensitivity: skill.data_sensitivity,
        tips: skill.tips,
        organization_id: profile.organization_id,
        owner_id: user.id,
        forked_from: skill.id,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
    } else if (forked) {
      toast.success("Skill forked! You can now customize it.");
      router.push(`/skills/${forked.id}/edit`);
    }
    setLoading(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleFork} disabled={loading}>
      <GitFork className="mr-1 h-3 w-3" />
      {loading ? "Forking..." : "Fork"}
    </Button>
  );
}
