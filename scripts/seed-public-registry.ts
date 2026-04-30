import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PUBLIC_SKILLS = [
  // ==========================================
  // Official Anthropic MCP Servers
  // ==========================================
  {
    title: "Google Drive",
    description: "Search, read, and manage files in Google Drive. List files, read document contents, and search across your Drive with full-text queries.",
    skill_type: "tool",
    instructions: `MCP Server: @anthropic/google-drive

Install:
  npx @anthropic/google-drive

Tools provided:
  - search(query) — search files by name or content
  - read_file(file_id) — read the full contents of a document
  - list_files(folder_id?) — list files in a folder or root

Requires: Google OAuth credentials configured.`,
    agent_compatibility: ["claude_code", "chatgpt", "cursor", "codex"],
    function_team: "Productivity",
    tags: ["google", "drive", "files", "documents", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Works with Docs, Sheets, Slides, PDFs, and plain text files. Set up OAuth credentials in Google Cloud Console first.",
  },
  {
    title: "Google Docs",
    description: "Read, create, and edit Google Docs documents. Full access to document content, formatting, comments, and suggestions through the Docs API.",
    skill_type: "tool",
    instructions: `MCP Server: google-docs connector

Install:
  npx @anthropic/google-docs

Tools provided:
  - read_document(doc_id) — read full document content
  - create_document(title, content) — create a new doc
  - update_document(doc_id, content) — append or replace content
  - list_comments(doc_id) — read document comments

Requires: Google OAuth with Docs API scope.`,
    agent_compatibility: ["claude_code", "chatgpt", "cursor"],
    function_team: "Productivity",
    tags: ["google", "docs", "documents", "writing", "mcp-server"],
    data_sensitivity: "public",
    tips: "Pair with the Google Drive connector to search for docs and then read/edit them.",
  },
  {
    title: "GitHub",
    description: "Interact with GitHub repositories, issues, pull requests, and code. Search repos, read files, create issues, review PRs, and manage branches.",
    skill_type: "tool",
    instructions: `MCP Server: @modelcontextprotocol/server-github

Install:
  npx @modelcontextprotocol/server-github

Tools provided:
  - search_repositories(query) — search GitHub repos
  - get_file_contents(owner, repo, path) — read a file
  - create_issue(owner, repo, title, body) — create an issue
  - list_issues(owner, repo) — list open issues
  - create_pull_request(owner, repo, title, body, head, base) — open a PR
  - search_code(query) — search code across repos

Requires: GITHUB_TOKEN environment variable.`,
    agent_compatibility: ["claude_code", "chatgpt", "copilot", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["github", "git", "code", "issues", "pull-requests", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Set GITHUB_TOKEN with repo scope for full access. Works great for automated issue triage and PR reviews.",
  },
  {
    title: "Slack",
    description: "Read and send Slack messages, manage channels, search message history. Connect your AI agent to your team's Slack workspace.",
    skill_type: "tool",
    instructions: `MCP Server: @modelcontextprotocol/server-slack

Install:
  npx @modelcontextprotocol/server-slack

Tools provided:
  - list_channels() — list all channels
  - read_channel(channel_id, limit?) — read recent messages
  - post_message(channel_id, text) — send a message
  - search_messages(query) — search message history
  - get_thread(channel_id, thread_ts) — read a thread

Requires: SLACK_BOT_TOKEN and SLACK_TEAM_ID environment variables.`,
    agent_compatibility: ["claude_code", "chatgpt", "cursor"],
    function_team: "Communication",
    tags: ["slack", "messaging", "communication", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Create a Slack app at api.slack.com, add bot token scopes: channels:history, channels:read, chat:write, search:read.",
  },
  {
    title: "PostgreSQL",
    description: "Query and manage PostgreSQL databases. Run SELECT queries, describe tables, list schemas, and inspect database structure safely.",
    skill_type: "tool",
    instructions: `MCP Server: @modelcontextprotocol/server-postgres

Install:
  npx @modelcontextprotocol/server-postgres postgresql://user:pass@host:5432/db

Tools provided:
  - query(sql) — run a read-only SQL query
  - list_tables() — list all tables in the database
  - describe_table(table_name) — show column types and constraints

Connection string passed as the first argument.
Read-only by default for safety.`,
    agent_compatibility: ["claude_code", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["postgres", "database", "sql", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Use a read-only database user for safety. Great for data exploration and generating reports from your database.",
  },
  {
    title: "Filesystem",
    description: "Read, write, and manage files on the local filesystem. Navigate directories, read file contents, create and edit files with sandboxed access.",
    skill_type: "tool",
    instructions: `MCP Server: @modelcontextprotocol/server-filesystem

Install:
  npx @modelcontextprotocol/server-filesystem /path/to/allowed/directory

Tools provided:
  - read_file(path) — read file contents
  - write_file(path, content) — create or overwrite a file
  - list_directory(path) — list files and folders
  - move_file(source, destination) — move or rename
  - search_files(path, pattern) — search by name pattern
  - get_file_info(path) — file metadata (size, modified date)

Access is sandboxed to the specified directory.`,
    agent_compatibility: ["claude_code", "chatgpt", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["filesystem", "files", "local", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Specify the root directory as the argument. The server cannot access files outside this directory.",
  },
  {
    title: "Brave Search",
    description: "Search the web using Brave Search API. Get search results with snippets, URLs, and metadata. Both web search and local search supported.",
    skill_type: "tool",
    instructions: `MCP Server: @modelcontextprotocol/server-brave-search

Install:
  npx @modelcontextprotocol/server-brave-search

Tools provided:
  - brave_web_search(query, count?) — search the web
  - brave_local_search(query, count?) — search for local businesses/places

Requires: BRAVE_API_KEY environment variable.
Get a free API key at https://brave.com/search/api/`,
    agent_compatibility: ["claude_code", "chatgpt", "cursor", "codex"],
    function_team: "Research",
    tags: ["search", "web", "brave", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Free tier gives 2,000 queries/month. Good for research tasks where the agent needs current information.",
  },
  {
    title: "Puppeteer",
    description: "Control a headless browser to navigate web pages, take screenshots, click elements, fill forms, and extract content from any website.",
    skill_type: "tool",
    instructions: `MCP Server: @modelcontextprotocol/server-puppeteer

Install:
  npx @modelcontextprotocol/server-puppeteer

Tools provided:
  - navigate(url) — go to a URL
  - screenshot(name?) — take a screenshot
  - click(selector) — click an element
  - fill(selector, value) — fill an input
  - evaluate(script) — run JavaScript in the page
  - get_content() — get page HTML content

Launches a headless Chromium browser.`,
    agent_compatibility: ["claude_code", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["browser", "web", "scraping", "automation", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Useful for web scraping, testing, and automating web interactions. Screenshots are returned as base64 images.",
  },
  {
    title: "SQLite",
    description: "Query and manage SQLite databases. Create tables, run queries, analyze data, and manage local database files.",
    skill_type: "tool",
    instructions: `MCP Server: @modelcontextprotocol/server-sqlite

Install:
  npx @modelcontextprotocol/server-sqlite /path/to/database.db

Tools provided:
  - read_query(sql) — run a SELECT query
  - write_query(sql) — run INSERT/UPDATE/DELETE
  - create_table(sql) — create a table
  - list_tables() — list all tables
  - describe_table(name) — show schema

Database file path passed as argument.`,
    agent_compatibility: ["claude_code", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["sqlite", "database", "sql", "local", "mcp-server", "official"],
    data_sensitivity: "public",
    tips: "Great for local data analysis, prototyping, and working with embedded databases.",
  },
  // ==========================================
  // Popular Community MCP Servers
  // ==========================================
  {
    title: "Linear",
    description: "Manage Linear issues, projects, and cycles. Create issues, update status, search across projects, and sync your AI workflow with your project tracker.",
    skill_type: "tool",
    instructions: `MCP Server: linear-mcp

Install:
  npx linear-mcp

Tools provided:
  - search_issues(query) — search issues
  - create_issue(title, description, team_id) — create an issue
  - update_issue(issue_id, status?) — update issue status
  - list_projects() — list all projects
  - get_issue(issue_id) — get issue details

Requires: LINEAR_API_KEY environment variable.`,
    agent_compatibility: ["claude_code", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["linear", "project-management", "issues", "mcp-server", "community"],
    data_sensitivity: "public",
    tips: "Get your API key from Linear Settings > API. Works well for automating issue creation from bug reports.",
  },
  {
    title: "Notion",
    description: "Read and write Notion pages, databases, and blocks. Search across your workspace, create pages, and update database entries.",
    skill_type: "tool",
    instructions: `MCP Server: notion-mcp

Install:
  npx notion-mcp

Tools provided:
  - search(query) — search pages and databases
  - read_page(page_id) — read page content
  - create_page(parent_id, title, content) — create a page
  - query_database(database_id, filter?) — query a database
  - update_page(page_id, properties) — update page properties

Requires: NOTION_API_KEY environment variable.`,
    agent_compatibility: ["claude_code", "chatgpt", "cursor"],
    function_team: "Productivity",
    tags: ["notion", "wiki", "documentation", "mcp-server", "community"],
    data_sensitivity: "public",
    tips: "Create an integration at notion.so/my-integrations. Share specific pages/databases with the integration.",
  },
  {
    title: "Jira",
    description: "Manage Jira issues, projects, and sprints. Search issues with JQL, create tickets, update status, and automate your Jira workflow.",
    skill_type: "tool",
    instructions: `MCP Server: jira-mcp

Install:
  npx jira-mcp

Tools provided:
  - search_issues(jql) — search with JQL
  - create_issue(project, summary, type, description?) — create a ticket
  - update_issue(issue_key, fields) — update fields
  - get_issue(issue_key) — get full issue details
  - list_projects() — list all projects
  - transition_issue(issue_key, status) — change status

Requires: JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN.`,
    agent_compatibility: ["claude_code", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["jira", "project-management", "issues", "atlassian", "mcp-server", "community"],
    data_sensitivity: "public",
    tips: "Generate an API token at id.atlassian.com/manage-profile/security/api-tokens.",
  },
  {
    title: "Sentry",
    description: "Monitor and debug errors from Sentry. Search issues, view stack traces, resolve errors, and get error analytics from your Sentry projects.",
    skill_type: "tool",
    instructions: `MCP Server: sentry-mcp

Install:
  npx @sentry/mcp

Tools provided:
  - search_issues(query) — search error issues
  - get_issue(issue_id) — get issue details with stack trace
  - list_projects() — list Sentry projects
  - resolve_issue(issue_id) — mark as resolved

Requires: SENTRY_AUTH_TOKEN and SENTRY_ORG environment variables.`,
    agent_compatibility: ["claude_code", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["sentry", "errors", "debugging", "monitoring", "mcp-server", "community"],
    data_sensitivity: "public",
    tips: "Great for automated error triage. Agent can read the stack trace and suggest fixes.",
  },
  // ==========================================
  // Common Prompts and Workflows
  // ==========================================
  {
    title: "Code Review Checklist",
    description: "A structured code review prompt that checks for security vulnerabilities, performance issues, error handling gaps, and style consistency across any language.",
    skill_type: "prompt",
    instructions: `Review this code change with the following checklist:

1. **Security**: Check for injection vulnerabilities, hardcoded secrets, insecure deserialization, and missing input validation.
2. **Performance**: Look for N+1 queries, unnecessary re-renders, missing indexes, unbounded loops, and memory leaks.
3. **Error handling**: Verify all error paths are handled. Check for swallowed exceptions, missing try/catch on async operations.
4. **Edge cases**: Test with null/undefined, empty arrays, very long strings, concurrent access, and boundary values.
5. **Style**: Consistent naming, no dead code, DRY violations, and appropriate abstraction level.

For each issue found, state:
- File and line number
- Severity (P0-P3)
- What's wrong
- How to fix it`,
    agent_compatibility: ["claude_code", "chatgpt", "copilot", "cursor", "codex", "gemini"],
    function_team: "Engineering",
    tags: ["code-review", "security", "quality", "public-skill"],
    data_sensitivity: "public",
    tips: "Works best when you paste the diff directly. For large PRs, break into logical chunks.",
  },
  {
    title: "Meeting Notes to Action Items",
    description: "Transforms raw meeting notes or transcripts into structured action items with owners, deadlines, and context. Identifies decisions and open questions.",
    skill_type: "prompt",
    instructions: `Transform these meeting notes into structured output:

## Decisions Made
- [Decision] — made by [who], rationale: [why]

## Action Items
| # | Action | Owner | Deadline | Context |
|---|--------|-------|----------|---------|
| 1 | [specific action] | [name] | [date or "TBD"] | [why this matters] |

## Open Questions
- [Question] — needs input from [who] by [when]

## Key Discussion Points
- [Topic]: [2-3 sentence summary of the discussion and conclusion]

Rules:
- Action items must be specific and actionable
- Every action item needs an owner
- Flag any decisions that contradict previous decisions
- Preserve exact numbers, dates, and commitments`,
    agent_compatibility: ["claude_code", "chatgpt", "gemini", "copilot", "cursor"],
    function_team: "Product",
    tags: ["meetings", "action-items", "productivity", "public-skill"],
    data_sensitivity: "public",
    tips: "Paste raw notes or transcript. Messy is fine.",
  },
  {
    title: "Incident Postmortem Template",
    description: "Structures a blameless incident postmortem with timeline, 5-whys root cause analysis, impact assessment, and prioritized action items. Based on Google SRE practices.",
    skill_type: "workflow",
    instructions: `# Incident Postmortem

## Step 1: Collect facts
- Incident title and severity (SEV1-4)
- Detection time, response time, resolution time
- Who was involved, what systems were affected
- Customer impact (how many users, what they experienced)

## Step 2: Build the timeline
| Time (UTC) | Event | Actor | System |

## Step 3: Root cause (5 Whys)
1. Why did the incident happen? → [proximate cause]
2. Why did that happen? → [deeper cause]
3. Continue until you reach a systemic issue

Distinguish: Trigger vs Root Cause vs Contributing Factors

## Step 4: Impact
- Duration, users affected, revenue impact, data integrity, SLA impact

## Step 5: Action items
| # | Action | Owner | Priority | Prevents |
Categories: Detection, Prevention, Mitigation, Process

Focus on systems, not people. "The deploy process allowed..." not "Engineer X deployed..."`,
    agent_compatibility: ["claude_code", "chatgpt", "gemini", "copilot", "cursor", "codex"],
    function_team: "Engineering",
    tags: ["incidents", "postmortem", "sre", "reliability", "public-skill"],
    data_sensitivity: "public",
    tips: "Run within 48 hours of the incident while memories are fresh.",
  },
  {
    title: "Database Migration Safety Check",
    description: "Reviews a database migration for production safety: locking risks, backwards compatibility, data loss potential, rollback strategy, and performance impact.",
    skill_type: "prompt",
    instructions: `Review this database migration for production safety:

### 1. Locking
- Does this acquire locks on large tables?
- Estimate lock duration for 10M+ rows
- Suggest non-locking alternatives (CREATE INDEX CONCURRENTLY, etc.)

### 2. Backwards Compatibility
- Can old code work with new schema? (deploy migration before code)
- Can new code work with old schema? (deploy code before migration)

### 3. Data Safety
- Does this delete or modify existing data?
- Risk of data loss if migration fails midway?
- Are defaults correct for existing rows?

### 4. Rollback
- Write the rollback migration
- Can rollback run without data loss?
- Point of no return?

### 5. Performance
- Full table scan required?
- Estimated execution time
- Maintenance window needed?

Output: SAFE / CAUTION / UNSAFE verdict with reasons.`,
    agent_compatibility: ["claude_code", "cursor", "copilot", "codex"],
    function_team: "Engineering",
    tags: ["database", "migrations", "safety", "production", "public-skill"],
    data_sensitivity: "public",
    tips: "Include the table size (row count) if known. Mention the database engine.",
  },
];

async function seedPublicRegistry(orgId: string, ownerId: string) {
  console.log(`Seeding ${PUBLIC_SKILLS.length} public skills...`);

  let success = 0;
  let skipped = 0;

  for (const skill of PUBLIC_SKILLS) {
    // Check if skill already exists (by title)
    const { data: existing } = await supabase
      .from("skills")
      .select("id")
      .eq("organization_id", orgId)
      .eq("title", skill.title)
      .single();

    if (existing) {
      console.log(`  ⊘ ${skill.title} (already exists)`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("skills").insert({
      ...skill,
      organization_id: orgId,
      owner_id: ownerId,
    });

    if (error) {
      console.error(`  ✗ ${skill.title}: ${error.message}`);
    } else {
      console.log(`  ✓ ${skill.title}`);
      success++;
    }
  }

  console.log(`\nDone: ${success} added, ${skipped} skipped.`);
}

const orgId = process.argv[2];
const ownerId = process.argv[3];

if (!orgId || !ownerId) {
  console.error("Usage: npx tsx scripts/seed-public-registry.ts <org-id> <owner-id>");
  console.error("");
  console.error("Find these values:");
  console.error("  org-id:   SELECT id FROM organizations;");
  console.error("  owner-id: SELECT id FROM profiles;");
  process.exit(1);
}

seedPublicRegistry(orgId, ownerId);
