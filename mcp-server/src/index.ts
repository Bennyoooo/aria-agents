#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { execSync } from "child_process";

const API_KEY = process.env.ARIA_API_KEY;
const SUPABASE_URL = process.env.ARIA_SUPABASE_URL || process.env.ARIA_SERVER_URL;
const SERVICE_KEY = process.env.ARIA_SERVICE_KEY;

if (!API_KEY || !SUPABASE_URL) {
  console.error("Missing ARIA_API_KEY or ARIA_SUPABASE_URL environment variables");
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.error("Missing ARIA_SERVICE_KEY (Supabase service role key)");
  process.exit(1);
}

let ORG_ID: string | null = null;

function curlJson(url: string): unknown {
  const result = execSync(
    `curl -s -H "apikey: ${SERVICE_KEY}" -H "Authorization: Bearer ${SERVICE_KEY}" "${url}"`,
    { encoding: "utf-8", timeout: 10000 }
  );
  return JSON.parse(result);
}

function curlPost(url: string, data: unknown): unknown {
  const json = JSON.stringify(data).replace(/'/g, "'\\''");
  const result = execSync(
    `curl -s -X POST -H "apikey: ${SERVICE_KEY}" -H "Authorization: Bearer ${SERVICE_KEY}" -H "Content-Type: application/json" -d '${json}' "${url}"`,
    { encoding: "utf-8", timeout: 10000 }
  );
  try { return JSON.parse(result); } catch { return {}; }
}

function getOrgId(): string {
  if (ORG_ID) return ORG_ID;
  const orgs = curlJson(
    `${SUPABASE_URL}/rest/v1/organizations?select=id&api_key=eq.${API_KEY}`
  ) as Array<{ id: string }>;
  if (!Array.isArray(orgs) || orgs.length === 0) {
    throw new Error("Invalid API key — no organization found");
  }
  ORG_ID = orgs[0].id;
  return ORG_ID;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiCall(path: string, method: string = "GET", body?: unknown): Promise<any> {
  const orgId = getOrgId();

  if (path === "/api/skills/search" && method === "POST") {
    const { query, filters } = body as { query?: string; filters?: Record<string, string> };
    let url = `${SUPABASE_URL}/rest/v1/skills_with_stats?organization_id=eq.${orgId}&is_hidden=eq.false&order=use_count.desc&limit=10&select=id,title,description,skill_type,agent_compatibility,function_team,tags,avg_rating,use_count,feedback_count`;
    if (query) url += `&or=(title.ilike.%25${encodeURIComponent(query)}%25,description.ilike.%25${encodeURIComponent(query)}%25)`;
    if (filters?.skill_type) url += `&skill_type=eq.${filters.skill_type}`;
    if (filters?.agent_compatibility) url += `&agent_compatibility=cs.{${filters.agent_compatibility}}`;
    if (filters?.function_team) url += `&function_team=eq.${encodeURIComponent(filters.function_team)}`;
    return { skills: curlJson(url) };
  }

  if (path === "/api/skills" && method === "GET") {
    const skills = curlJson(
      `${SUPABASE_URL}/rest/v1/skills_with_stats?organization_id=eq.${orgId}&is_hidden=eq.false&order=created_at.desc&limit=100&select=id,title,description,skill_type,agent_compatibility,function_team,tags,avg_rating,use_count,feedback_count`
    ) as unknown[];
    return { skills, total: skills.length };
  }

  if (path === "/api/skills" && method === "POST") {
    const result = curlPost(`${SUPABASE_URL}/rest/v1/skills?select=id,title,created_at`, {
      ...(body as Record<string, unknown>),
      organization_id: orgId,
    });
    return { skill: result };
  }

  const skillIdMatch = path.match(/^\/api\/skills\/([^/]+)$/);
  if (skillIdMatch && method === "GET") {
    const id = skillIdMatch[1];
    const skills = curlJson(
      `${SUPABASE_URL}/rest/v1/skills_with_stats?id=eq.${id}&select=*`
    ) as unknown[];
    if (!Array.isArray(skills) || skills.length === 0) throw new Error("Skill not found");
    const skill = skills[0] as Record<string, unknown>;
    const fb = curlJson(
      `${SUPABASE_URL}/rest/v1/feedback?skill_id=eq.${id}&select=outcome,notes&order=created_at.desc&limit=5`
    ) as Array<{ outcome: string; notes: string }>;
    return {
      ...skill,
      feedback_summary: {
        success_rate: skill.success_rate,
        avg_rating: skill.avg_rating,
        total_uses: skill.use_count,
        total_feedback: skill.feedback_count,
        recent_notes: (fb || []).filter(f => f.notes).map(f => f.notes),
      },
    };
  }

  if (path.match(/\/invoke$/) && method === "POST") {
    const id = path.split("/")[3];
    const skills = curlJson(
      `${SUPABASE_URL}/rest/v1/skills?id=eq.${id}&select=instructions,tips`
    ) as unknown[];
    if (!Array.isArray(skills) || skills.length === 0) throw new Error("Skill not found");
    // Log copy event
    curlPost(`${SUPABASE_URL}/rest/v1/copy_events`, { skill_id: id, source: "mcp" });
    return skills[0];
  }

  if (path.match(/\/feedback$/) && method === "POST") {
    const id = path.split("/")[3];
    curlPost(`${SUPABASE_URL}/rest/v1/feedback`, {
      skill_id: id,
      source: "agent",
      ...(body as Record<string, unknown>),
    });
    return { logged: true };
  }

  throw new Error(`Unknown API path: ${path}`);
}

const server = new McpServer({
  name: "aria-skills",
  version: "0.1.0",
});

// Tool: search_skills
server.tool(
  "search_skills",
  "Search for AI skills shared by your organization. Returns matching skills with ratings and usage stats.",
  {
    query: z.string().optional().describe("Search query to match against skill titles and descriptions"),
    skill_type: z.enum(["skill", "mcp", "agent", "plugin"]).optional().describe("Filter by type: skill (instructions/recipes), mcp (external tool connectors), agent (autonomous workflows), plugin (bundled packages)"),
    agent: z.string().optional().describe("Filter by compatible agent (e.g., claude_code, chatgpt, copilot)"),
    team: z.string().optional().describe("Filter by team/function (e.g., Engineering, Support)"),
    tags: z.array(z.string()).optional().describe("Filter by tags"),
  },
  async (params) => {
    const result = await apiCall("/api/skills/search", "POST", {
      query: params.query,
      filters: {
        skill_type: params.skill_type,
        agent_compatibility: params.agent,
        function_team: params.team,
        tags: params.tags,
      },
    });

    if (!result.skills || result.skills.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No skills found matching your search." }],
      };
    }

    const formatted = result.skills.map((s: {
      title: string;
      description: string;
      skill_type: string;
      avg_rating: number | null;
      use_count: number;
      id: string;
      function_team: string;
    }, i: number) => {
      const rating = s.avg_rating ? `${s.avg_rating.toFixed(1)}/5` : "no ratings";
      return `${i + 1}. **${s.title}** (${s.skill_type})\n   ${s.description.slice(0, 100)}...\n   Rating: ${rating} | Uses: ${s.use_count} | Team: ${s.function_team}\n   ID: ${s.id}`;
    }).join("\n\n");

    return {
      content: [{ type: "text" as const, text: `Found ${result.skills.length} skills:\n\n${formatted}\n\nUse get_skill or invoke_skill with the skill ID to get full details or instructions.` }],
    };
  }
);

// Tool: get_skill
server.tool(
  "get_skill",
  "Get full details of a specific skill including instructions, tips, and feedback summary.",
  {
    skill_id: z.string().describe("The UUID of the skill to retrieve"),
  },
  async (params) => {
    const skill = await apiCall(`/api/skills/${params.skill_id}`);

    const lines = [
      `# ${skill.title}`,
      `**Type:** ${skill.skill_type}`,
      `**Team:** ${skill.function_team}`,
      `**Compatible with:** ${skill.agent_compatibility.join(", ")}`,
      skill.tags?.length ? `**Tags:** ${skill.tags.join(", ")}` : null,
      "",
      `## Description`,
      skill.description,
      "",
      `## Instructions`,
      skill.instructions,
      skill.tips ? `\n## Tips\n${skill.tips}` : null,
      "",
      `## Feedback Summary`,
      `- Success rate: ${skill.feedback_summary.success_rate != null ? `${(skill.feedback_summary.success_rate * 100).toFixed(0)}%` : "no data"}`,
      `- Average rating: ${skill.feedback_summary.avg_rating?.toFixed(1) || "no ratings"}`,
      `- Total uses: ${skill.feedback_summary.total_uses}`,
      `- Total feedback: ${skill.feedback_summary.total_feedback}`,
      skill.feedback_summary.recent_notes?.length
        ? `\n### Recent Notes\n${skill.feedback_summary.recent_notes.map((n: string) => `- ${n}`).join("\n")}`
        : null,
    ].filter(Boolean).join("\n");

    return { content: [{ type: "text" as const, text: lines }] };
  }
);

// Tool: invoke_skill
server.tool(
  "invoke_skill",
  "Invoke a skill to get its instructions. The agent should follow these instructions to complete the task. This also logs a usage event.",
  {
    skill_id: z.string().describe("The UUID of the skill to invoke"),
  },
  async (params) => {
    const result = await apiCall(`/api/skills/${params.skill_id}/invoke`, "POST");

    const text = [
      "## Skill Instructions",
      "",
      result.instructions,
      result.tips ? `\n---\n**Tips:** ${result.tips}` : null,
      "",
      "---",
      "*After completing this task, please use log_feedback to report the outcome.*",
    ].filter(Boolean).join("\n");

    return { content: [{ type: "text" as const, text }] };
  }
);

// Tool: log_feedback (single skill)
server.tool(
  "log_feedback",
  "Log feedback for a single skill. For batch feedback on all skills used in a task, use log_task_feedback instead.",
  {
    skill_id: z.string().describe("The UUID of the skill"),
    outcome: z.enum(["success", "failure", "partial"]).describe("How well it worked"),
    rating: z.number().min(1).max(5).optional().describe("Rating 1-5"),
    notes: z.string().optional().describe("What worked, what didn't, suggestions"),
    agent_name: z.string().optional().describe("Agent name"),
  },
  async (params) => {
    await apiCall(`/api/skills/${params.skill_id}/feedback`, "POST", {
      outcome: params.outcome,
      rating: params.rating,
      notes: params.notes,
      agent_name: params.agent_name || "claude_code",
    });
    return { content: [{ type: "text" as const, text: "Feedback logged." }] };
  }
);

// Tool: log_task_feedback (batch — call this when finishing ANY task)
server.tool(
  "log_task_feedback",
  "IMPORTANT: Call this when you finish ANY task. Report feedback for every skill, MCP tool, or resource you used during the task. This is how the knowledge base improves. Include both successes and failures.",
  {
    task_summary: z.string().describe("One-line summary of what the task was"),
    feedback: z.array(z.object({
      skill_id: z.string().describe("UUID of the skill/tool used"),
      outcome: z.enum(["success", "failure", "partial"]),
      notes: z.string().optional().describe("What worked or didn't, suggestions for improvement"),
    })).describe("Feedback for each skill/tool used during the task"),
    agent_name: z.string().optional(),
  },
  async (params) => {
    let logged = 0;
    let errors = 0;

    for (const fb of params.feedback) {
      try {
        await apiCall(`/api/skills/${fb.skill_id}/feedback`, "POST", {
          outcome: fb.outcome,
          notes: fb.notes ? `[Task: ${params.task_summary}] ${fb.notes}` : `[Task: ${params.task_summary}]`,
          agent_name: params.agent_name || "claude_code",
        });
        logged++;
      } catch {
        errors++;
      }
    }

    return {
      content: [{ type: "text" as const, text: `Task feedback logged: ${logged} skills reported${errors > 0 ? `, ${errors} errors` : ""}. The knowledge base will use this to improve.` }],
    };
  }
);

// Tool: create_skill
server.tool(
  "create_skill",
  "Create a new skill in your organization's marketplace. Use this to share a useful prompt, workflow, or tool with your team.",
  {
    title: z.string().describe("Short, descriptive title for the skill"),
    description: z.string().min(50).describe("Description of what the skill does (min 50 chars)"),
    skill_type: z.enum(["skill", "mcp", "agent", "plugin"]).describe("Type: skill (instructions), mcp (tool connector), agent (autonomous workflow), plugin (bundle)"),
    instructions: z.string().describe("The actual prompt or instructions the agent should follow"),
    agent_compatibility: z.array(z.string()).describe("Compatible agents: claude_code, opencode, chatgpt, copilot, gemini, codex, cursor"),
    function_team: z.string().describe("Team or function this skill belongs to (e.g., Engineering, Support)"),
    owner_id: z.string().describe("UUID of the skill owner (your user ID)"),
    tags: z.array(z.string()).optional().describe("Tags for discovery"),
    tips: z.string().optional().describe("Tips for getting the best results"),
  },
  async (params) => {
    const result = await apiCall("/api/skills", "POST", {
      title: params.title,
      description: params.description,
      skill_type: params.skill_type,
      instructions: params.instructions,
      agent_compatibility: params.agent_compatibility,
      function_team: params.function_team,
      owner_id: params.owner_id,
      tags: params.tags || [],
      tips: params.tips,
    });

    if (result.error) {
      return { content: [{ type: "text" as const, text: `Error: ${result.error}` }] };
    }

    return {
      content: [{ type: "text" as const, text: `Skill created: **${result.skill.title}** (ID: ${result.skill.id})\nCreated at: ${result.skill.created_at}\n\nYour team can now find and use this skill!` }],
    };
  }
);

// Tool: list_skills
server.tool(
  "list_skills",
  "List all available skills in your organization. Simpler than search — just shows everything.",
  {},
  async () => {
    const result = await apiCall("/api/skills");

    if (!result.skills || result.skills.length === 0) {
      return { content: [{ type: "text" as const, text: "No skills available in your organization yet." }] };
    }

    const formatted = result.skills.map((s: {
      title: string;
      skill_type: string;
      avg_rating: number | null;
      use_count: number;
      id: string;
      function_team: string;
    }, i: number) => {
      const rating = s.avg_rating ? `${s.avg_rating.toFixed(1)}/5` : "—";
      return `${i + 1}. **${s.title}** (${s.skill_type}) — ${s.function_team} | Rating: ${rating} | Uses: ${s.use_count} | ID: ${s.id}`;
    }).join("\n");

    return {
      content: [{ type: "text" as const, text: `${result.total} skills available:\n\n${formatted}` }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
