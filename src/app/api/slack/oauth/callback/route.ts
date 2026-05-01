import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  if (error) {
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=no_code`);
  }

  // Exchange code for token
  const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${appUrl}/api/slack/oauth/callback`,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.ok) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=${encodeURIComponent(tokenData.error || "oauth_failed")}`
    );
  }

  const botToken = tokenData.access_token;
  const teamId = tokenData.team?.id;
  const teamName = tokenData.team?.name;

  if (!botToken || !teamId) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_token`);
  }

  // Get the user's org from the state or from a cookie
  // For now, we'll look up by the installer's email via Slack
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get channels the bot has access to
  const channelsResponse = await fetch("https://slack.com/api/conversations.list?types=public_channel&limit=200", {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const channelsData = await channelsResponse.json();
  const channelIds = channelsData.channels
    ?.filter((c: { is_member: boolean }) => c.is_member)
    .map((c: { id: string }) => c.id) || [];

  // Find the org — use the first org for now (single-tenant for small teams)
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  const orgId = orgs?.[0]?.id;
  if (!orgId) {
    return NextResponse.redirect(`${appUrl}/integrations?error=no_organization`);
  }

  // Upsert the slack connection
  const { error: dbError } = await supabase
    .from("slack_connections")
    .upsert(
      {
        organization_id: orgId,
        slack_team_id: teamId,
        slack_team_name: teamName,
        bot_token: botToken,
        channels: channelIds,
        is_active: true,
      },
      { onConflict: "organization_id,slack_team_id" }
    );

  if (dbError) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=${encodeURIComponent(dbError.message)}`
    );
  }

  return NextResponse.redirect(`${appUrl}/integrations?success=slack_connected&team=${encodeURIComponent(teamName || teamId)}`);
}
