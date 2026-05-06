import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const interestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(255),
  company: z.string().trim().min(1).max(180),
  role: z.string().trim().max(140).optional().default(""),
  teamSize: z.string().trim().max(60).optional().default(""),
  platforms: z.string().trim().max(500).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: NextRequest) {
  const parsed = interestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form fields and try again." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { name, email, company, role, teamSize, platforms, message } = parsed.data;
  const { error } = await supabase.from("demo_requests").insert({
    name,
    email,
    business: company,
    role: role || null,
    team_size: teamSize || null,
    platforms: platforms || null,
    message: message || null,
    source: "interest_page",
    metadata: {
      user_agent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    },
  });

  if (error) {
    console.error("Interest form insert failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
