import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SkillCard } from "@/components/skill-card";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function MySkillsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: mySkills } = await supabase
    .from("skills_with_stats")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });

  const { data: hiddenSkills } = await supabase
    .from("skills_with_stats")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_hidden", true)
    .order("created_at", { ascending: false });

  // Skills I've used (copy events)
  const { data: usedEvents } = await supabase
    .from("copy_events")
    .select("skill_id")
    .eq("user_id", user.id);

  const usedSkillIds = [...new Set(usedEvents?.map((e) => e.skill_id) || [])];

  let usedSkills = null;
  if (usedSkillIds.length > 0) {
    const { data } = await supabase
      .from("skills_with_stats")
      .select("*")
      .in("id", usedSkillIds)
      .eq("is_hidden", false);
    usedSkills = data;
  }

  // Skills I've given feedback on
  const { data: feedbackEvents } = await supabase
    .from("feedback")
    .select("skill_id")
    .eq("user_id", user.id);

  const feedbackSkillIds = [...new Set(feedbackEvents?.map((e) => e.skill_id) || [])];

  let feedbackSkills = null;
  if (feedbackSkillIds.length > 0) {
    const { data } = await supabase
      .from("skills_with_stats")
      .select("*")
      .in("id", feedbackSkillIds)
      .eq("is_hidden", false);
    feedbackSkills = data;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Skills</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Skills you&apos;ve created, used, and reviewed
          </p>
        </div>
        <Link href="/submit" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Skill
        </Link>
      </div>

      <Tabs defaultValue="created">
        <TabsList>
          <TabsTrigger value="created">
            Created ({mySkills?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="used">
            Used ({usedSkills?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({feedbackSkills?.length || 0})
          </TabsTrigger>
          {hiddenSkills && hiddenSkills.length > 0 && (
            <TabsTrigger value="hidden">
              Hidden ({hiddenSkills.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="created" className="mt-4">
          {!mySkills || mySkills.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted-foreground">You haven&apos;t created any skills yet.</p>
              <Link href="/submit" className={buttonVariants({ variant: "outline" })}>
                Create your first skill
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="used" className="mt-4">
          {!usedSkills || usedSkills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You haven&apos;t used any skills yet. Browse the marketplace to find skills.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usedSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="mt-4">
          {!feedbackSkills || feedbackSkills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You haven&apos;t reviewed any skills yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedbackSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </TabsContent>

        {hiddenSkills && hiddenSkills.length > 0 && (
          <TabsContent value="hidden" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hiddenSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
