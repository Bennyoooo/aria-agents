# Aria — Self-evolving AI knowledge platform

Your team's AI playbook. Share prompts, workflows, and tools across every agent. Aria learns from how your team works and gets smarter over time.

## What is Aria?

Aria is a self-evolving knowledge sharing platform for AI teams. It captures what works (prompts, workflows, MCP tools), shares it across your organization, and improves through agent feedback. It comes pre-loaded with every major public MCP connector and skill so your team starts with a full toolkit on day one.

Three ways knowledge enters Aria:
1. **Manual** — create and share skills through the web UI
2. **Passive** — Slack bot listens to your team's channels and surfaces skill-worthy content
3. **Agent feedback** — AI agents report what worked and what didn't, so skills improve over time

## Architecture

- **Web UI** (Next.js 15 + Supabase + Vercel) — browse, create, review, and manage skills
- **MCP Server** (`aria-skills`) — agents search/invoke skills directly
- **REST API** — agent-agnostic endpoints for any AI tool
- **Slack Bot** — passively extracts skills from team conversations
- **Public Registry** — pre-loaded with major MCP connectors (Google Drive, GitHub, Slack, PostgreSQL, etc.)
- **Feedback Loop** — agents report outcomes, skills compound over time

## Setup

### 1. Supabase

Create a Supabase project and run the migrations in order:

```bash
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_skill_versions_and_forks.sql
supabase/migrations/003_skill_candidates.sql
```

Enable Google OAuth in Supabase Auth settings (optional, email/password works immediately).

### 2. Environment Variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and service role key
```

### 3. Run

```bash
npm install
npm run dev
```

### 4. MCP Server (for AI agent integration)

```bash
cd mcp-server && npm install
```

Add to Claude Code config (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "aria-skills": {
      "command": "npx",
      "args": ["tsx", "/path/to/aria_agents/mcp-server/src/index.ts"],
      "env": {
        "ARIA_API_KEY": "<your-org-api-key>",
        "ARIA_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_skills` | Search skills by query, type, agent, team, or tags |
| `get_skill` | Get full skill details with feedback summary |
| `invoke_skill` | Get instructions to execute, logs usage |
| `log_feedback` | Report outcome after using a skill |
| `create_skill` | Create a new skill from the agent |
| `list_skills` | List all available skills |

## API Endpoints

All endpoints authenticate via `Authorization: Bearer <org-api-key>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/skills/search` | Search skills |
| GET | `/api/skills/[id]` | Get skill details |
| POST | `/api/skills/[id]/invoke` | Invoke skill |
| POST | `/api/skills/[id]/feedback` | Submit feedback |
| POST | `/api/skills` | Create skill |
| GET | `/api/skills` | List all skills |
| GET | `/api/skills/export` | Export skills as JSON |
| POST | `/api/skills/import` | Import skills |
| POST | `/api/skills/[id]/fork` | Fork a skill |
| GET | `/api/skills/[id]/versions` | Version history |
| POST | `/api/slack/events` | Slack event listener |
| POST | `/api/slack/digest` | Run daily Slack digest |
