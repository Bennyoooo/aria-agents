import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreMessage } from "@/lib/slack/extractor";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Slack URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Only process event callbacks
  if (body.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = body.event;

  // Only process messages (not edits, deletes, bot messages, etc.)
  if (
    event.type !== "message" ||
    event.subtype ||
    event.bot_id ||
    !event.text
  ) {
    return NextResponse.json({ ok: true });
  }

  // Score the message for skill-worthiness
  const { score, type } = scoreMessage({
    text: event.text,
    user: event.user,
    ts: event.ts,
    channel: event.channel,
    thread_ts: event.thread_ts,
  });

  // Only capture high-confidence messages
  if (score < 0.4) {
    return NextResponse.json({ ok: true });
  }

  // Store as a pending skill candidate
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("skill_candidates").insert({
    source: "slack",
    source_channel: event.channel,
    source_message_ts: event.ts,
    source_user: event.user,
    source_text: event.text,
    suggested_type: type,
    confidence: score,
    slack_team_id: body.team_id,
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
