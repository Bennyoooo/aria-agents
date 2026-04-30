# Aria Agent Integration Guide

Connect any AI agent to your team's Aria knowledge base in under 2 minutes.

## Quick Setup (Claude Code)

### Step 1: Add MCP server to your config

Add to `~/.claude/settings.json` (or your project's `.claude/settings.json`):

```json
{
  "mcpServers": {
    "aria": {
      "command": "npx",
      "args": ["tsx", "/path/to/aria_agents/mcp-server/src/index.ts"],
      "env": {
        "ARIA_API_KEY": "<your-api-key-from-settings-page>",
        "ARIA_SERVER_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Step 2: Add these instructions to your CLAUDE.md

Add this to your project's `CLAUDE.md` (or `~/.claude/CLAUDE.md` for global):

```markdown
## Aria Knowledge Base

You have access to your team's shared knowledge base via the `aria` MCP server.

### When to search Aria
- Before starting any task, search Aria for relevant skills: `search_skills("keyword")`
- When you encounter a pattern you've seen before
- When asked to do something that sounds like it could be a common workflow

### When to create entries
- After completing a task that involved a reusable workflow or prompt
- When you discover a useful MCP server or tool configuration
- When you write instructions that another team member might need

### When to leave feedback
- After using any Aria skill, call `log_feedback` with:
  - outcome: "success" if it worked, "failure" if it didn't, "partial" if it partly worked
  - rating: 1-5
  - notes: what worked, what didn't, what could be improved
- This is how the knowledge base improves over time

### Available tools
- `search_skills(query)` — find relevant skills, MCPs, agents, or plugins
- `get_skill(skill_id)` — read full details and instructions
- `invoke_skill(skill_id)` — get instructions to follow (logs a usage event)
- `log_feedback(skill_id, outcome, rating?, notes?)` — report results
- `create_skill(title, description, ...)` — add new knowledge
- `list_skills()` — see everything available
```

### Step 3: Restart your agent

Restart Claude Code (or your agent). It will now have access to all 6 Aria tools.

## Quick Setup (OpenCode / OpenWork)

Same MCP config format. Add to your OpenCode config:

```yaml
mcpServers:
  aria:
    command: npx
    args: ["tsx", "/path/to/aria_agents/mcp-server/src/index.ts"]
    env:
      ARIA_API_KEY: <your-api-key>
      ARIA_SERVER_URL: http://localhost:3001
```

## Quick Setup (Cursor)

Add to Cursor's MCP settings (Settings > MCP Servers):

- Name: `aria`
- Command: `npx tsx /path/to/aria_agents/mcp-server/src/index.ts`
- Environment: `ARIA_API_KEY=<key>`, `ARIA_SERVER_URL=http://localhost:3001`

## How It Works

```
You work normally with your AI agent
  → Agent searches Aria before starting tasks
  → Agent finds relevant skills/MCPs/agents
  → Agent follows the instructions
  → Agent reports back: did it work? what could be better?
  → Knowledge base gets smarter
  → Next person benefits from what you learned
```

The key behaviors the CLAUDE.md instructions enable:

1. **Search before doing** — the agent checks if someone already solved this
2. **Contribute after doing** — the agent creates new entries for reusable work
3. **Feedback always** — the agent reports outcomes so skills improve over time

## API Key

Find your API key at: `http://localhost:3001/settings`

Each organization has one API key. All team members share the same key. The key identifies your org so you see your team's knowledge, not other orgs'.

## Verifying It Works

After setup, ask your agent:

> "Search aria for code review skills"

It should call `search_skills` and return results from your knowledge base. If it doesn't find anything, it means the MCP connection is working but your knowledge base needs more content.

## Troubleshooting

- **Agent doesn't see Aria tools**: Restart the agent after adding MCP config
- **Connection refused**: Make sure the Aria web app is running (`npm run dev`)
- **Empty results**: Run the seed script to populate with public skills
- **Auth error**: Check your API key in Settings matches the one in your config
