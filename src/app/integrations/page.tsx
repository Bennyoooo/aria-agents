"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageSquare, Check, Plug, RefreshCw } from "lucide-react";

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

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const team = searchParams.get("team");

    if (success === "slack_connected") {
      toast.success(`Connected to ${team || "Slack"}!`);
      setTeamName(team);
    }
    if (error) {
      toast.error(`Slack error: ${error}`);
    }

    loadChannels();
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

      {/* Future integrations placeholder */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="text-muted-foreground">More integrations coming</CardTitle>
              <CardDescription>Google Drive, Notion, email, and more</CardDescription>
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
