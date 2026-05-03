#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.ARIA_API_KEY;
const SERVER_URL = process.env.ARIA_SERVER_URL;

if (!API_KEY || !SERVER_URL) {
  console.error("Missing ARIA_API_KEY or ARIA_SERVER_URL environment variables");
  process.exit(1);
}

const BASE_URL = SERVER_URL.replace(/\/$/, "");

async function apiCall(path: string, method: string = "GET", body?: unknown) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json();
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
