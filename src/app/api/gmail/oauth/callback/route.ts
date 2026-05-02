import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
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

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${appUrl}/api/gmail/oauth/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const people = google.people({ version: "v1", auth: oauth2Client });
    const me = await people.people.get({ resourceName: "people/me", personFields: "emailAddresses" });
    const email = me.data.emailAddresses?.[0]?.value || "unknown";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the org
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    const orgId = orgs?.[0]?.id;
    if (!orgId) {
      return NextResponse.redirect(`${appUrl}/integrations?error=no_organization`);
    }

    // Store the Gmail connection
    await supabase.from("gmail_connections").upsert(
      {
        organization_id: orgId,
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true,
        scan_labels: ["INBOX"],
      },
      { onConflict: "organization_id,email" }
    );

    return NextResponse.redirect(`${appUrl}/integrations?success=gmail_connected&email=${encodeURIComponent(email)}`);
  } catch (err) {
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent((err as Error).message)}`);
  }
}
