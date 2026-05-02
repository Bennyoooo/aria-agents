import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { extractFromEmails, type EmailMessage } from "@/lib/gmail/extractor";

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

  // Get all active Gmail connections for this org
  const { data: connections } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("organization_id", organization_id)
    .eq("is_active", true);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ error: "No active Gmail connections" }, { status: 404 });
  }

  let totalScanned = 0;
  let totalCandidates = 0;

  for (const connection of connections) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );

    oauth2Client.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
    });

    // Refresh token if needed
    if (connection.token_expiry && new Date(connection.token_expiry) < new Date()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await supabase.from("gmail_connections").update({
          access_token: credentials.access_token,
          token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        }).eq("id", connection.id);
      } catch {
        await supabase.from("gmail_connections").update({ is_active: false }).eq("id", connection.id);
        continue;
      }
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

    try {
      // List messages from the last 24 hours
      const listRes = await gmail.users.messages.list({
        userId: "me",
        q: `after:${oneDayAgo} -category:promotions -category:social -category:updates`,
        maxResults: 50,
        labelIds: connection.scan_labels || ["INBOX"],
      });

      const messageIds = listRes.data.messages || [];
      const emails: EmailMessage[] = [];

      for (const msg of messageIds.slice(0, 30)) {
        try {
          const full = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "full",
          });

          const headers = full.data.payload?.headers || [];
          const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

          // Extract body
          let body = "";
          const parts = full.data.payload?.parts || [];
          if (parts.length > 0) {
            const textPart = parts.find(p => p.mimeType === "text/plain");
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
            }
          } else if (full.data.payload?.body?.data) {
            body = Buffer.from(full.data.payload.body.data, "base64").toString("utf-8");
          }

          emails.push({
            id: msg.id!,
            from: getHeader("From"),
            to: getHeader("To"),
            subject: getHeader("Subject"),
            body,
            date: getHeader("Date"),
            threadId: full.data.threadId || "",
            labels: full.data.labelIds || [],
          });
        } catch {
          // Skip individual message errors
        }
      }

      totalScanned += emails.length;

      // Extract skill candidates
      const candidates = extractFromEmails(emails);
      totalCandidates += candidates.length;

      // Store candidates
      for (const candidate of candidates) {
        await supabase.from("skill_candidates").insert({
          organization_id,
          source: "email",
          source_channel: candidate.source_from,
          source_message_ts: candidate.source_email_id,
          source_user: candidate.source_from,
          source_text: candidate.source_text,
          suggested_type: candidate.suggested_type,
          suggested_title: candidate.title,
          confidence: candidate.confidence,
          status: "pending",
        });
      }
    } catch (err) {
      console.error(`Gmail digest error for ${connection.email}:`, err);
    }
  }

  return NextResponse.json({
    accounts_scanned: connections.length,
    emails_scanned: totalScanned,
    candidates_found: totalCandidates,
  });
}
