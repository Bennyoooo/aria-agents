import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateApiKey } from "@/lib/supabase/api";
import { isPackageType } from "@/lib/packages/manifest";
import { resolvePackageVersion } from "@/lib/packages/registry";

export async function POST(request: NextRequest) {
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const { type, name, version } = body as {
    type?: string;
    name?: string;
    version?: string;
  };

  if (!type || !isPackageType(type)) {
    return NextResponse.json(
      { error: "type must be one of: skill, mcp, agent, plugin" },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const resolved = await resolvePackageVersion(supabase, org.id, type, name, version);

  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  return NextResponse.json(resolved);
}
