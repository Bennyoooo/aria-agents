"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function SkillActions({ skillId, isHidden }: { skillId: string; isHidden: boolean }) {
  const router = useRouter();

  const toggleVisibility = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("skills")
      .update({ is_hidden: !isHidden })
      .eq("id", skillId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isHidden ? "Skill is now visible" : "Skill is now hidden");
    router.refresh();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => router.push(`/skills/${skillId}/edit`)}>
        <Pencil className="mr-1 h-3 w-3" />
        Edit
      </Button>
      <Button variant="outline" size="sm" onClick={toggleVisibility}>
        {isHidden ? (
          <>
            <Eye className="mr-1 h-3 w-3" />
            Unhide
          </>
        ) : (
          <>
            <EyeOff className="mr-1 h-3 w-3" />
            Hide
          </>
        )}
      </Button>
    </div>
  );
}
