"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CopyButton({
  text,
  skillId,
  label = "Copy",
}: {
  text: string;
  skillId: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("copy_events").insert({
      skill_id: skillId,
      user_id: user?.id || null,
      source: "web",
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-1 h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-1 h-3 w-3" />
          {label}
        </>
      )}
    </Button>
  );
}
