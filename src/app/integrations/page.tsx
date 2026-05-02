"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageSquare, Mail, Check, Plug, RefreshCw } from "lucide-react";

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  num_members: number;
  monitored: boolean;
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const team = searchParams.get("team");

    if (success === "slack_connected") {
      toast.success(`Connected to ${team || "Slack"}!`);
      setTeamName(team);
    }
    if (success === "gmail_connected") {
      const email = searchParams.get("email");
      toast.success(`Connected ${email || "Gmail"}!`);
      setGmailConnected(true);
      setGmailEmail(email);
    }
    if (error) {
      toast.error(`Error: ${error}`);
    }

    loadChannels();
    checkGmail();
  }, [searchParams]);

  async function loadChannels() {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/slack/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels);
        setConnectionId(data.connection_id);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
    setLoadingChannels(false);
  }

  async function saveChannels() {
    if (!connectionId) return;
    setSaving(true);

    const monitored = channels.filter(c => c.monitored).map(c => c.id);
    const res = await fetch("/api/slack/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: monitored, connection_id: connectionId }),
    });

    if (res.ok) {
      toast.success(`Monitoring ${monitored.length} channels`);
    } else {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  function toggleChannel(channelId: string) {
    setChannels(prev =>
      prev.map(c => c.id === channelId ? { ...c, monitored: !c.monitored } : c)
    );
  }

  async function checkGmail() {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase
        .from("gmail_connections")
        .select("email, is_active")
        .eq("is_active", true)
        .limit(1)
        .single();
      if (data) {
        setGmailConnected(true);
        setGmailEmail(data.email);
      }
    } catch {
      // not connected
    }
  }

  const monitoredCount = channels.filter(c => c.monitored).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="h-6 w-6" />
          Integrations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect external tools to automatically capture knowledge for your team
        </p>
      </div>

      {/* Slack */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Slack</CardTitle>
                <CardDescription>
                  {connected
                    ? `Connected to ${teamName || "your workspace"}`
                    : "Monitor channels for skill-worthy messages"}
                </CardDescription>
              </div>
            </div>
            {connected ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                <Check className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Button onClick={() => window.location.href = "/api/slack/oauth"}>
                Connect Slack
              </Button>
            )}
          </div>
        </CardHeader>

        {connected && (
          <CardContent className="space-y-4">
            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium">Monitored Channels</h3>
                  <p className="text-xs text-muted-foreground">
                    Aria listens to these channels and surfaces skill-worthy messages for review
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{monitoredCount} active</Badge>
                  <Button variant="ghost" size="sm" onClick={loadChannels}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {loadingChannels ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {channels.map(channel => (
                    <label
                      key={channel.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                        channel.monitored ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <Checkbox
                        checked={channel.monitored}
                        onCheckedChange={() => toggleChannel(channel.id)}
                      />
                      <span className="text-sm font-medium flex-1">#{channel.name}</span>
                      <span className="text-xs text-muted-foreground">{channel.num_members} members</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-3">
                <Button onClick={saveChannels} disabled={saving} size="sm">
                  {saving ? "Saving..." : "Save Channel Selection"}
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-1">How it works</h3>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Aria listens to messages in the channels you select</li>
                <li>Messages that look like skills (prompts, workflows, tips) are flagged</li>
                <li>Your team reviews suggestions at the <a href="/review" className="text-primary hover:underline">Review page</a></li>
                <li>Approved suggestions become entries in your knowledge base</li>
              </ol>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Gmail */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle>Gmail</CardTitle>
                <CardDescription>
                  {gmailConnected
                    ? `Connected as ${gmailEmail}`
                    : "Scan emails for skill-worthy knowledge your team shares"}
                </CardDescription>
              </div>
            </div>
            {gmailConnected ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-200">
                <Check className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <Button onClick={() => window.location.href = "/api/gmail/oauth"}>
                Connect Gmail
              </Button>
            )}
          </div>
        </CardHeader>
        {gmailConnected && (
          <CardContent>
            <Separator className="mb-4" />
            <div>
              <h3 className="text-sm font-medium mb-1">How it works</h3>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Aria scans your inbox daily (read-only, we never send emails)</li>
                <li>Emails with how-tos, workflows, templates, or shared knowledge get flagged</li>
                <li>Forwards, newsletters, promotions, and auto-generated emails are skipped</li>
                <li>Your team reviews suggestions at the <a href="/review" className="text-primary hover:underline">Review page</a></li>
              </ol>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Future integrations */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-muted-foreground">More integrations coming</CardTitle>
              <CardDescription>Google Drive, Notion, Confluence, and more</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsContent />
    </Suspense>
  );
}
