"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { ProfileForm } from "@/components/profile-form";
import { Key, Building, User, Terminal } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrg] = useState<{ id: string; name: string; domain: string; api_key: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        if (profileData.organization_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", profileData.organization_id)
            .single();
          setOrg(orgData);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="h-7 w-32 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!profile) return <p className="text-muted-foreground">Not logged in</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {org && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organization
            </CardTitle>
            <CardDescription>Auto-assigned based on your email domain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{org.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Domain</span>
              <Badge variant="secondary">{org.domain}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {org && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </CardTitle>
            <CardDescription>Use this key to connect AI agents to your knowledge base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                {org.api_key}
              </code>
              <CopyButton text={org.api_key} skillId="api-key" label="Copy" />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Agent Integration</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Add this to your agent's MCP config to connect to your knowledge base:
              </p>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre">
{`{
  "mcpServers": {
    "aria": {
      "command": "npx",
      "args": ["tsx", "<path-to>/mcp-server/src/index.ts"],
      "env": {
        "ARIA_API_KEY": "${org.api_key}",
        "ARIA_SERVER_URL": "http://localhost:3001"
      }
    }
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
