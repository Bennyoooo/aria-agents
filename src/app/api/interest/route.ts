import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
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

  const { name, email, company, role, teamSize, platforms, message } = parsed.data;
  const result = await insertDemoRequest({
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

  if (!result.ok) {
    console.error("Interest form insert failed", result.error);

    if (result.error.includes("demo_requests") || result.error.includes("PGRST205")) {
      return NextResponse.json({
        error: "Interest form storage is not enabled yet. Please try again soon.",
      }, { status: 503 });
    }

    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

async function insertDemoRequest(payload: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/demo_requests`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) return { ok: true };

    return { ok: false, error: await response.text() };
  } catch (error) {
    try {
      const output = execFileSync("curl", [
        "-sS",
        "-w",
        "\n%{http_code}",
        "-X",
        "POST",
        url,
        "-H",
        `apikey: ${serviceKey}`,
        "-H",
        `Authorization: Bearer ${serviceKey}`,
        "-H",
        "Content-Type: application/json",
        "-H",
        "Prefer: return=minimal",
        "--data",
        JSON.stringify(payload),
      ], { encoding: "utf-8", maxBuffer: 1024 * 1024 });

      const marker = output.lastIndexOf("\n");
      const body = marker >= 0 ? output.slice(0, marker) : output;
      const status = Number(marker >= 0 ? output.slice(marker + 1) : "0");

      if (status >= 200 && status < 300) return { ok: true };

      return { ok: false, error: body || `Supabase REST returned ${status}` };
    } catch (curlError) {
      const message = curlError instanceof Error ? curlError.message : String(curlError);
      return { ok: false, error: `${error instanceof Error ? error.message : String(error)}; ${message}` };
    }
  }
}
