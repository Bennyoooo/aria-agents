# Aria - Agent Skill Marketplace

Create, discover, and share AI skills across your organization. Skills work across Claude Code, ChatGPT, Copilot, Gemini, and more.

## What is this?

Aria is an internal skill marketplace where teams share reusable AI skills (prompts, workflows, tools, context packs). Engineers discover and invoke skills directly from their AI agents via an MCP server. Agents leave feedback after using skills, creating a self-improving loop.

## Architecture

- **Web UI** (Next.js 15 + Supabase + Vercel) — browse, create, and manage skills
- **MCP Server** (`aria-skills` npm package) — search/invoke skills from within Claude Code
- **REST API** — agent-agnostic endpoints for any AI tool
- **Feedback loop** — agents report outcomes, skills improve over time

## Setup

### 1. Supabase

Create a Supabase project and run the migration:

```bash
# Copy the SQL from supabase/migrations/001_initial_schema.sql
# and run it in the Supabase SQL Editor
```

Enable Google OAuth in Supabase Auth settings.

### 2. Environment Variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and service role key
```

### 3. Run the app

```bash
npm install
npm run dev
```

### 4. MCP Server (for Claude Code integration)

```bash
cd mcp-server
npm install
```

Add to your Claude Code config (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "aria-skills": {
      "command": "npx",
      "args": ["tsx", "/path/to/aria_agents/mcp-server/src/index.ts"],
      "env": {
        "ARIA_API_KEY": "<your-org-api-key-from-settings-page>",
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

## API Endpoints

All endpoints authenticate via `Authorization: Bearer <org-api-key>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/skills/search` | Search skills |
| GET | `/api/skills/[id]` | Get skill details |
| POST | `/api/skills/[id]/invoke` | Invoke skill |
| POST | `/api/skills/[id]/feedback` | Submit feedback |
