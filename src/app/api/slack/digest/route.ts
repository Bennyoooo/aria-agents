import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WebClient } from "@slack/web-api";
import { extractSkillsFromMessages, type SlackMessage } from "@/lib/slack/extractor";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { organization_id } = body;

  if (!organization_id) {
    return NextResponse.json({ error: "organization_id required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the Slack connection for this org
  const { data: connection } = await supabase
    .from("slack_connections")
    .select("*")
    .eq("organization_id", organization_id)
    .eq("is_active", true)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "No active Slack connection" }, { status: 404 });
  }

  const slack = new WebClient(connection.bot_token);
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
  const allMessages: SlackMessage[] = [];

  // Fetch messages from each monitored channel
  for (const channel of connection.channels || []) {
    try {
      const result = await slack.conversations.history({
        channel,
        oldest: String(oneDayAgo),
        limit: 200,
      });

      if (result.messages) {
        for (const msg of result.messages) {
          if (msg.text && msg.user && msg.ts && !msg.bot_id && !msg.subtype) {
            allMessages.push({
              text: msg.text,
              user: msg.user,
              ts: msg.ts,
              channel,
              thread_ts: msg.thread_ts,
            });
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch channel ${channel}:`, err);
    }
  }

  // Extract skill candidates
  const candidates = extractSkillsFromMessages(allMessages);

  // Store candidates
  const inserted = [];
  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("skill_candidates")
      .insert({
        organization_id,
        source: "slack",
        source_channel: candidate.source_channel,
        source_message_ts: candidate.source_message_ts,
        source_user: candidate.source_user,
        source_text: candidate.instructions,
        suggested_type: candidate.skill_type,
        suggested_title: candidate.title,
        confidence: candidate.confidence,
        slack_team_id: connection.slack_team_id,
        status: "pending",
      })
      .select("id")
      .single();

    if (data) inserted.push(data);
  }

  return NextResponse.json({
    messages_scanned: allMessages.length,
    candidates_found: candidates.length,
    candidates_stored: inserted.length,
    channels_scanned: connection.channels?.length || 0,
  });
}
