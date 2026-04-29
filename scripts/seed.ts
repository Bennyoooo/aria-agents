import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SEED_SKILLS = [
  {
    title: "Code Review Checklist",
    description:
      "A structured code review prompt that checks for security vulnerabilities, performance issues, error handling gaps, and style consistency. Works with any language.",
    skill_type: "prompt",
    instructions: `Review this code change with the following checklist:

1. **Security**: Check for injection vulnerabilities (SQL, XSS, command injection), hardcoded secrets, insecure deserialization, and missing input validation.
2. **Performance**: Look for N+1 queries, unnecessary re-renders, missing indexes, unbounded loops, and memory leaks.
3. **Error handling**: Verify all error paths are handled. Check for swallowed exceptions, missing try/catch on async operations, and unclear error messages.
4. **Edge cases**: Test with null/undefined, empty arrays, very long strings, concurrent access, and boundary values.
5. **Style**: Consistent naming, no dead code, DRY violations, and appropriate abstraction level.

For each issue found, state:
- File and line number
- Severity (P0-P3)
- What's wrong
- How to fix it`,
    agent_compatibility: ["claude_code", "chatgpt", "copilot", "cursor"],
    function_team: "Engineering",
    tags: ["code-review", "security", "quality"],
    data_sensitivity: "internal",
    tips: "Works best when you paste the diff directly. For large PRs, break into logical chunks.",
  },
  {
    title: "Bug Report Summarizer",
    description:
      "Takes a raw bug report (from Jira, Linear, or plain text) and produces a structured summary with reproduction steps, expected vs actual behavior, and severity assessment.",
    skill_type: "prompt",
    instructions: `Analyze this bug report and produce a structured summary:

## Summary
One sentence describing the bug.

## Reproduction Steps
1. Step-by-step instructions to reproduce
2. Include specific data, URLs, or configurations needed
3. Note which step triggers the bug

## Expected Behavior
What should happen when following the steps above.

## Actual Behavior
What actually happens. Include error messages verbatim.

## Severity Assessment
- **Impact**: How many users are affected? (all / subset / edge case)
- **Workaround**: Is there a workaround? What is it?
- **Data loss**: Does this cause data loss or corruption?
- **Recommended priority**: P0 (drop everything) / P1 (this sprint) / P2 (next sprint) / P3 (backlog)

## Technical Notes
Any clues about root cause based on the symptoms described.`,
    agent_compatibility: ["claude_code", "chatgpt", "gemini"],
    function_team: "Engineering",
    tags: ["bugs", "triage", "support"],
    data_sensitivity: "internal",
    tips: "Paste the raw bug report text. The more detail in the original report, the better the summary.",
  },
  {
    title: "Customer Escalation Response",
    description:
      "Drafts a professional response to an escalated customer support ticket. Acknowledges the issue, explains next steps, and sets expectations on timeline. Tone-appropriate for enterprise customers.",
    skill_type: "prompt",
    instructions: `Draft a response to this escalated customer support ticket. Follow this structure:

1. **Acknowledge** the customer's frustration specifically (reference their exact issue, don't be generic)
2. **Apologize** without over-apologizing. One clear "I'm sorry" is better than three hedged ones.
3. **Explain** what happened in plain language (no jargon, no blame)
4. **Next steps** - be specific about what you're doing to fix it and when they'll hear back
5. **Compensation** if appropriate (credit, extended trial, etc.) — suggest but let the support agent decide

Tone rules:
- Professional but human. Not robotic.
- Short sentences. No walls of text.
- Never say "I understand your frustration" (everyone says that, it means nothing)
- Never blame other teams or systems
- Use the customer's name`,
    agent_compatibility: ["chatgpt", "claude_code", "gemini"],
    function_team: "Support",
    tags: ["customer-support", "escalation", "communication"],
    data_sensitivity: "internal",
    tips: "Include the original ticket text and any internal context about the issue. Remove PII before sharing if using a public AI tool.",
  },
  {
    title: "Sprint Planning Facilitator",
    description:
      "A workflow for running async sprint planning. Takes a list of candidate tickets, estimates complexity, identifies dependencies, and suggests a sprint plan that fits the team's capacity.",
    skill_type: "workflow",
    instructions: `# Async Sprint Planning Workflow

## Step 1: Gather inputs
Ask for:
- List of candidate tickets (title + brief description)
- Team capacity this sprint (number of engineers, any PTO/holidays)
- Sprint duration (default: 2 weeks)
- Any carryover from last sprint

## Step 2: Estimate complexity
For each ticket, estimate:
- T-shirt size: XS (< 2 hrs), S (half day), M (1-2 days), L (3-5 days), XL (> 1 week)
- Confidence: High / Medium / Low
- Dependencies: other tickets that must complete first

## Step 3: Identify risks
- Flag tickets with Low confidence estimates
- Flag tickets with external dependencies
- Flag tickets larger than XL (should be broken down)

## Step 4: Suggest sprint plan
Create a sprint plan that:
- Fills ~80% of capacity (leave 20% buffer for bugs and interrupts)
- Respects dependency ordering
- Distributes risk (don't stack all low-confidence tickets)
- Groups related work for the same engineer

Output the plan as a table: Ticket | Assignee | Size | Priority | Dependencies | Notes`,
    agent_compatibility: ["claude_code", "chatgpt", "gemini", "copilot"],
    function_team: "Engineering",
    tags: ["planning", "sprints", "project-management"],
    data_sensitivity: "internal",
    tips: "Works best when you paste ticket titles and descriptions directly from your project tracker.",
  },
  {
    title: "API Documentation Generator",
    description:
      "Given a code file with API route handlers (Express, Next.js, FastAPI, etc.), generates OpenAPI-compatible documentation with request/response examples, error codes, and authentication requirements.",
    skill_type: "tool",
    instructions: `Analyze the provided API route code and generate documentation for each endpoint:

## For each endpoint, document:

### [METHOD] /path
**Description:** What this endpoint does (one sentence)
**Authentication:** Required? What type? (Bearer token, API key, cookie)
**Rate limit:** If applicable

#### Request
- **Headers:** Required headers
- **Path params:** With types and descriptions
- **Query params:** With types, defaults, and descriptions
- **Body:** JSON schema with types, required fields, and examples

#### Response
- **200:** Success response with example JSON
- **4xx:** Client error codes with descriptions
- **5xx:** Server error description

#### Example
\`\`\`bash
curl -X METHOD https://api.example.com/path \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'
\`\`\`

Generate in valid OpenAPI 3.0 YAML format at the end.`,
    agent_compatibility: ["claude_code", "cursor", "copilot"],
    function_team: "Engineering",
    tags: ["documentation", "api", "openapi"],
    data_sensitivity: "public",
    tips: "Paste the full route handler file. The more code context, the better the docs.",
  },
  {
    title: "Meeting Notes to Action Items",
    description:
      "Transforms raw meeting notes or transcripts into structured action items with owners, deadlines, and context. Identifies decisions made, open questions, and follow-ups needed.",
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

## Follow-ups
- [ ] [Next meeting or check-in needed]
- [ ] [Documents or artifacts to create]

Rules:
- Action items must be specific and actionable (not "think about X" but "draft proposal for X")
- Every action item needs an owner (if unclear from notes, flag as "Owner: TBD")
- Flag any decisions that seem to contradict previous decisions
- If the notes mention numbers, dates, or commitments, preserve them exactly`,
    agent_compatibility: ["chatgpt", "claude_code", "gemini"],
    function_team: "Product",
    tags: ["meetings", "action-items", "productivity"],
    data_sensitivity: "internal",
    tips: "Paste the raw notes or transcript. Messy is fine, the AI will structure it.",
  },
  {
    title: "Database Migration Safety Check",
    description:
      "Reviews a database migration file (SQL or ORM) for safety issues: locking risks on large tables, backwards compatibility, data loss potential, and rollback strategy. Designed for production databases.",
    skill_type: "prompt",
    instructions: `Review this database migration for production safety:

## Check each of these:

### 1. Locking
- Does this migration acquire locks on large tables? (ALTER TABLE, ADD COLUMN NOT NULL, CREATE INDEX)
- Estimate lock duration for a table with 10M+ rows
- Suggest non-locking alternatives if applicable (CREATE INDEX CONCURRENTLY, etc.)

### 2. Backwards Compatibility
- Can the old application code work with the new schema? (deploy migration before code)
- Can the new application code work with the old schema? (deploy code before migration)
- Is this a two-phase migration? (add column → backfill → add constraint)

### 3. Data Safety
- Does this migration delete or modify existing data?
- Is there a risk of data loss if the migration fails midway?
- Are default values correct for existing rows?

### 4. Rollback
- Write the rollback migration (the reverse of this change)
- Can the rollback be run without data loss?
- Is there a point of no return? (e.g., column drop after backfill)

### 5. Performance
- Will this migration cause a full table scan?
- Estimated execution time on production data volume
- Should this run during a maintenance window?

Output a SAFE / CAUTION / UNSAFE verdict with specific reasons.`,
    agent_compatibility: ["claude_code", "cursor", "copilot"],
    function_team: "Engineering",
    tags: ["database", "migrations", "safety", "production"],
    data_sensitivity: "internal",
    tips: "Include the table size (row count) if known. Mention the database engine (Postgres, MySQL, etc.).",
  },
  {
    title: "Onboarding Buddy",
    description:
      "A context pack for new engineers joining the team. Contains pointers to key documentation, architecture overview, dev environment setup, and common gotchas. Customize per team.",
    skill_type: "context_pack",
    instructions: `# New Engineer Onboarding Context

## Architecture Overview
- Frontend: Next.js 15 (App Router) deployed on Vercel
- Backend: Supabase (PostgreSQL + Auth + RLS)
- AI Integration: MCP server for Claude Code

## Key Repositories
- aria_agents — main application (this repo)
- mcp-server — MCP server for agent integration

## Development Setup
1. Clone the repo
2. Copy .env.local.example to .env.local and fill in Supabase credentials
3. npm install
4. npm run dev
5. Open http://localhost:3000

## Important Files
- src/app/page.tsx — browse page (home)
- src/app/submit/page.tsx — skill creation
- src/app/skills/[id]/page.tsx — skill detail with feedback
- src/app/api/ — REST API for MCP integration
- supabase/migrations/ — database schema
- mcp-server/src/index.ts — MCP server

## Common Gotchas
- RLS policies require auth context — API routes use service role key
- The skills_with_stats view joins feedback and copy_events for aggregated metrics
- Google OAuth requires corporate email (public domains are blocked)

## Team Contacts
- [Your name] — project lead
- [Team channel] — questions and discussions`,
    agent_compatibility: ["claude_code", "chatgpt", "cursor"],
    function_team: "Engineering",
    tags: ["onboarding", "documentation", "getting-started"],
    data_sensitivity: "internal",
    tips: "Customize the repository URLs, team contacts, and gotchas section for your specific team before sharing.",
  },
  {
    title: "Legal Contract Clause Analyzer",
    description:
      "Reviews contract clauses for common risks: unfavorable terms, missing protections, ambiguous language, and non-standard provisions. Highlights what to negotiate and what to accept.",
    skill_type: "prompt",
    instructions: `Analyze the following contract clause(s) and provide:

## For each clause:

### Summary
Plain-language explanation of what this clause means (no legal jargon).

### Risk Assessment
- **Risk level:** Low / Medium / High / Critical
- **Who benefits:** This clause primarily favors [Party A / Party B / Neutral]
- **What could go wrong:** Specific scenarios where this clause hurts us

### Red Flags
- Ambiguous terms that could be interpreted against us
- Missing protections we should have
- Non-standard provisions (compared to industry norms)
- Unlimited liability or indemnification exposure

### Recommendation
- **Accept as-is:** If the clause is standard and fair
- **Negotiate:** Specific changes to request, with suggested language
- **Reject:** If the clause is unacceptable, explain why

### Standard Alternative
If recommending changes, provide the industry-standard version of this clause.

IMPORTANT: This is not legal advice. Flag anything that requires attorney review.`,
    agent_compatibility: ["chatgpt", "claude_code", "gemini"],
    function_team: "Legal",
    tags: ["contracts", "legal-review", "risk-assessment"],
    data_sensitivity: "confidential",
    tips: "Always mark as confidential. Remove counterparty names if using a public AI tool. This supplements, not replaces, attorney review.",
  },
  {
    title: "Incident Postmortem Template",
    description:
      "Structures a blameless incident postmortem with timeline, root cause analysis, impact assessment, and action items. Based on Google SRE practices adapted for smaller teams.",
    skill_type: "workflow",
    instructions: `# Incident Postmortem

## Step 1: Collect facts (do this within 24 hours)
Ask for:
- Incident title and severity (SEV1-4)
- Detection time, response time, resolution time
- Who was involved (responders, on-call, escalations)
- What systems were affected
- Customer impact (how many users, what they experienced)

## Step 2: Build the timeline
Create a minute-by-minute timeline:
| Time (UTC) | Event | Actor | System |
|------------|-------|-------|--------|

Include: first alert, first human response, each diagnostic step, each fix attempt, resolution, and all-clear.

## Step 3: Root cause analysis
Use the "5 Whys" technique:
1. Why did the incident happen? → [proximate cause]
2. Why did [proximate cause] happen? → [deeper cause]
3. Continue until you reach a systemic issue

Distinguish between:
- **Trigger:** What started the incident
- **Root cause:** The systemic issue that allowed the trigger to cause an incident
- **Contributing factors:** Things that made the incident worse or longer

## Step 4: Impact assessment
- Duration: [X hours/minutes]
- Users affected: [number or percentage]
- Revenue impact: [if measurable]
- Data integrity: [any data loss or corruption?]
- SLA impact: [any SLA violations?]

## Step 5: Action items
| # | Action | Owner | Priority | Deadline | Prevents |
|---|--------|-------|----------|----------|----------|
(Each action item should prevent recurrence of this specific incident or class of incidents)

Categories:
- **Detection:** Could we have caught this faster?
- **Prevention:** Could we have prevented this entirely?
- **Mitigation:** Could we have reduced the impact?
- **Process:** Do we need to change how we respond?

## Blameless culture note
Focus on systems, not people. "The deploy process allowed..." not "Engineer X deployed..."`,
    agent_compatibility: ["claude_code", "chatgpt", "gemini", "copilot"],
    function_team: "Engineering",
    tags: ["incidents", "postmortem", "sre", "reliability"],
    data_sensitivity: "internal",
    tips: "Run this within 48 hours of the incident while memories are fresh. Share the draft with all responders for accuracy.",
  },
];

async function seed(orgId: string, ownerId: string) {
  console.log(`Seeding ${SEED_SKILLS.length} skills...`);

  for (const skill of SEED_SKILLS) {
    const { error } = await supabase.from("skills").insert({
      ...skill,
      organization_id: orgId,
      owner_id: ownerId,
    });

    if (error) {
      console.error(`Failed to seed "${skill.title}":`, error.message);
    } else {
      console.log(`  ✓ ${skill.title}`);
    }
  }

  console.log("Done!");
}

const orgId = process.argv[2];
const ownerId = process.argv[3];

if (!orgId || !ownerId) {
  console.error("Usage: npx tsx scripts/seed.ts <org-id> <owner-id>");
  console.error("");
  console.error("Find these values in your Supabase dashboard:");
  console.error("  org-id: SELECT id FROM organizations;");
  console.error("  owner-id: SELECT id FROM profiles;");
  process.exit(1);
}

seed(orgId, ownerId);
