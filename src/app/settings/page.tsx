import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/copy-button";
import { ProfileForm } from "@/components/profile-form";
import { Key, Building, User, Terminal } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p>Not logged in</p>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single();

  if (!profile) return <p>Profile not found</p>;

  const org = profile.organization as {
    id: string;
    name: string;
    domain: string;
    api_key: string;
    created_at: string;
  } | null;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
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

      {/* Organization */}
      {org && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organization
            </CardTitle>
            <CardDescription>
              Auto-assigned based on your email domain
            </CardDescription>
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Key */}
      {org && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </CardTitle>
            <CardDescription>
              Use this key to connect AI agents to your organization&apos;s skill marketplace
            </CardDescription>
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
                <span className="text-sm font-medium">MCP Server Setup</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Add this to your Claude Code MCP config to search and invoke skills from within your agent:
              </p>
              <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre">
{`// .claude/settings.json
{
  "mcpServers": {
    "aria-skills": {
      "command": "npx",
      "args": ["aria-skills"],
      "env": {
        "ARIA_API_KEY": "${org.api_key}",
        "ARIA_SERVER_URL": "${process.env.NEXT_PUBLIC_SUPABASE_URL || "<your-app-url>"}"
      }
    }
  }
}`}
              </pre>
              <CopyButton
                text={JSON.stringify({
                  mcpServers: {
                    "aria-skills": {
                      command: "npx",
                      args: ["aria-skills"],
                      env: {
                        ARIA_API_KEY: org.api_key,
                        ARIA_SERVER_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "<your-app-url>",
                      },
                    },
                  },
                }, null, 2)}
                skillId="mcp-config"
                label="Copy MCP Config"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
