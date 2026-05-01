import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: connection } = await supabase
    .from("slack_connections")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No Slack connection" }, { status: 404 });
  }

  const response = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200",
    { headers: { Authorization: `Bearer ${connection.bot_token}` } }
  );

  const data = await response.json();
  if (!data.ok) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }

  const channels = data.channels.map((c: { id: string; name: string; is_member: boolean; num_members: number }) => ({
    id: c.id,
    name: c.name,
    is_member: c.is_member,
    num_members: c.num_members,
    monitored: connection.channels?.includes(c.id) || false,
  }));

  return NextResponse.json({ channels, connection_id: connection.id });
}

export async function PATCH(request: NextRequest) {
  const { channels, connection_id } = await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("slack_connections")
    .update({ channels })
    .eq("id", connection_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, channels });
}
