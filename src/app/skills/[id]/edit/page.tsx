import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SkillForm } from "@/components/skill-form";
import { notFound } from "next/navigation";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: skill } = await supabase
    .from("skills")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!skill) return notFound();

  return <SkillForm skill={skill} mode="edit" />;
}
