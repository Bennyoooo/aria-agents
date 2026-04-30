# Aria — Team Install Guide

Get your team of 3 on Aria in 10 minutes.

## Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- Team members use the same corporate email domain

## Step 1: Clone and install (one person does this)

```bash
git clone https://github.com/Bennyoooo/aria-agents.git
cd aria-agents
npm install
cd mcp-server && npm install && cd ..
```

## Step 2: Set up Supabase (one person does this)

1. Go to https://supabase.com and create a project
2. Open the SQL Editor and run these files in order:
   - `supabase/full_migration.sql`
   - `supabase/fix_rls.sql`
   - `supabase/migrations/003_skill_candidates.sql`
   - `supabase/migrations/004_rename_types.sql`
3. Copy your project URL and keys from Settings > API

## Step 3: Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
```

## Step 4: Start the app

```bash
npm run dev
```

Open http://localhost:3000 (or whatever port it picks).

## Step 5: Sign up

Each team member goes to the app URL and signs up with their corporate email (e.g., `name@yourcompany.com`). Everyone with the same email domain is automatically placed in the same organization.

## Step 6: Seed the knowledge base

After signing up, get your org ID and user ID:
- Org ID: visible in Supabase dashboard > Table Editor > organizations
- User ID: visible in Supabase dashboard > Table Editor > profiles

```bash
source .env.local
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
npx tsx scripts/seed-public-registry.ts <org-id> <user-id>
```

Or use curl (if the above doesn't work on your network):
```bash
# The seed script output in the terminal shows curl commands
# See scripts/seed-public-registry.ts for the full list
```

## Step 7: Connect your AI agent

Each team member adds Aria to their AI agent. See `INTEGRATION.md` for full instructions.

**Quick version for Claude Code:**

1. Get your API key from http://localhost:3001/settings
2. Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "aria": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/aria_agents/mcp-server/src/index.ts"],
      "env": {
        "ARIA_API_KEY": "<api-key-from-settings>",
        "ARIA_SERVER_URL": "http://localhost:3001"
      }
    }
  }
}
```

3. Add to your `CLAUDE.md`:

```markdown
## Aria Knowledge Base

Search Aria (`search_skills`) before starting tasks. After completing work,
create entries for reusable patterns (`create_skill`) and always leave feedback
(`log_feedback`) on skills you use. This is how the team's knowledge compounds.
```

4. Restart Claude Code

## Step 8: Start using it

- Browse the knowledge base at http://localhost:3001
- Create skills through the web UI or directly from your agent
- Your agent will search Aria before tasks and contribute back after

## For remote / shared access

For a team, deploy to Vercel so everyone can access the web UI:

1. Push the repo to GitHub
2. Connect to Vercel: https://vercel.com/new
3. Add the 3 environment variables in Vercel's settings
4. Deploy

Update `ARIA_SERVER_URL` in everyone's MCP config to point to the Vercel URL instead of localhost.
