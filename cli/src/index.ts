#!/usr/bin/env node

import { Command } from "commander";
import { getConfig, saveConfig, apiCall, type RegistrySkill } from "./api.js";
import {
  getDetectedAgents,
  installSkillToAgent,
  installMcpToAgent,
  uninstallFromAgent,
  detectAgents,
} from "./agents.js";

const program = new Command();

program
  .name("aria")
  .description("Install and manage AI skills, MCPs, agents, and plugins across all your AI agents")
  .version("0.1.0");

// ============================================
// aria login
// ============================================
program
  .command("login")
  .description("Connect to your Aria knowledge base")
  .requiredOption("--api-key <key>", "Your org API key (from Settings page)")
  .requiredOption("--server <url>", "Aria server URL (e.g., http://localhost:3001)")
  .option("--supabase-url <url>", "Supabase project URL (for direct access)")
  .option("--service-key <key>", "Supabase service role key (for direct access)")
  .action(async (opts) => {
    saveConfig({
      api_key: opts.apiKey,
      server_url: opts.server,
      supabase_url: opts.supabaseUrl,
      service_key: opts.serviceKey,
    });
    console.log("✓ Logged in. Config saved to ~/.aria/config.json");

    const agents = getDetectedAgents();
    if (agents.length > 0) {
      console.log(`\nDetected agents: ${agents.map((a) => a.name).join(", ")}`);
    } else {
      console.log("\nNo agents detected. Install Claude Code, OpenCode, or Cursor first.");
    }
  });

// ============================================
// aria status
// ============================================
program
  .command("status")
  .description("Show connection status and detected agents")
  .action(async () => {
    const config = getConfig();
    if (!config) {
      console.log("Not logged in. Run: aria login --api-key <key> --server <url>");
      return;
    }

    console.log(`Server: ${config.server_url}`);
    console.log(`API Key: ${config.api_key.slice(0, 8)}...`);

    const agents = detectAgents();
    console.log("\nAgents:");
    for (const agent of agents) {
      console.log(`  ${agent.detected ? "✓" : "✗"} ${agent.name}`);
    }

    try {
      const health = (await apiCall("/api/health")) as Record<string, unknown>;
      console.log(`\nRegistry: ${health.name} (v${health.version})`);
    } catch (err) {
      console.log(`\nRegistry: unreachable (${(err as Error).message})`);
    }
  });

// ============================================
// aria search
// ============================================
program
  .command("search <query>")
  .description("Search the knowledge base")
  .option("-t, --type <type>", "Filter by type (skill, mcp, agent, plugin)")
  .action(async (query, opts) => {
    try {
      const result = (await apiCall("/api/skills/search", "POST", {
        query,
        filters: { skill_type: opts.type },
      })) as { skills: RegistrySkill[] };

      if (result.skills.length === 0) {
        console.log("No results found.");
        return;
      }

      console.log(`Found ${result.skills.length} results:\n`);
      for (const skill of result.skills) {
        const rating = skill.avg_rating ? `★${skill.avg_rating.toFixed(1)}` : "—";
        const type = skill.skill_type === "mcp" ? "MCP" : skill.skill_type;
        console.log(`  ${skill.title} [${type}]`);
        console.log(`    ${skill.description.slice(0, 80)}...`);
        console.log(`    ${rating} | ${skill.use_count} uses | agents: ${skill.agent_compatibility.join(", ")}`);
        console.log(`    id: ${skill.id}`);
        console.log();
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
    }
  });

// ============================================
// aria list
// ============================================
program
  .command("list")
  .description("List all items in your knowledge base")
  .option("-t, --type <type>", "Filter by type")
  .action(async (opts) => {
    try {
      const result = (await apiCall("/api/skills")) as {
        skills: RegistrySkill[];
        total: number;
      };

      const filtered = opts.type
        ? result.skills.filter((s) => s.skill_type === opts.type)
        : result.skills;

      console.log(`${filtered.length} items:\n`);
      for (const skill of filtered) {
        const type = skill.skill_type === "mcp" ? "MCP" : skill.skill_type;
        const agents = skill.agent_compatibility.slice(0, 3).join(", ");
        console.log(`  [${type.padEnd(6)}] ${skill.title.padEnd(35)} ${agents}`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
    }
  });

// ============================================
// aria install
// ============================================
program
  .command("install <id>")
  .description("Install a skill, MCP, agent, or plugin into all detected agents")
  .option("--project", "Install at project level (travels with the repo)")
  .option("--global", "Install at user level (default)")
  .option("--agent <agent>", "Install into a specific agent only (claude_code, opencode, cursor, codex)")
  .action(async (id, opts) => {
    const scope: "user" | "project" = opts.project ? "project" : "user";

    try {
      // Fetch the skill details
      const skill = (await apiCall(`/api/skills/${id}`)) as RegistrySkill & {
        instructions: string;
        tips: string | null;
      };

      console.log(`Installing: ${skill.title} [${skill.skill_type}]`);
      console.log(`Scope: ${scope}-level\n`);

      // Detect agents
      let agents = getDetectedAgents();

      // Filter by compatible agents
      agents = agents.filter((a) =>
        skill.agent_compatibility.includes(a.id)
      );

      // Filter to specific agent if requested
      if (opts.agent) {
        agents = agents.filter((a) => a.id === opts.agent);
      }

      if (agents.length === 0) {
        console.log("No compatible agents detected locally.");
        console.log(`This ${skill.skill_type} works with: ${skill.agent_compatibility.join(", ")}`);
        return;
      }

      // Generate the SKILL.md content
      const skillMd = generateSkillMd(skill);

      let installed = 0;

      for (const agent of agents) {
        try {
          if (skill.skill_type === "mcp") {
            // MCP: add to agent's MCP config
            const mcpConfig = parseMcpConfig(skill.instructions);
            const path = installMcpToAgent(agent, slugify(skill.title), mcpConfig, scope);
            console.log(`  ✓ ${agent.name}: added MCP config to ${path}`);
          } else {
            // Skill/Agent/Plugin: write SKILL.md
            const path = installSkillToAgent(agent, slugify(skill.title), skillMd, scope);
            console.log(`  ✓ ${agent.name}: installed to ${path}`);
          }
          installed++;
        } catch (err) {
          console.log(`  ✗ ${agent.name}: ${(err as Error).message}`);
        }
      }

      console.log(`\nInstalled into ${installed} agent${installed !== 1 ? "s" : ""}.`);

      // Log the install as a copy event
      try {
        await apiCall(`/api/skills/${id}/invoke`, "POST");
      } catch {
        // non-critical
      }

      if (skill.skill_type === "mcp") {
        console.log("\nNote: restart your agent(s) for the MCP connection to take effect.");
        if (skill.instructions.includes("Requires:") || skill.instructions.includes("env")) {
          console.log("Check the skill details for required environment variables.");
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
    }
  });

// ============================================
// aria uninstall
// ============================================
program
  .command("uninstall <slug>")
  .description("Remove a skill, MCP, agent, or plugin from all agents")
  .option("--project", "Uninstall from project level")
  .option("--agent <agent>", "Uninstall from a specific agent only")
  .action(async (slug, opts) => {
    const scope: "user" | "project" = opts.project ? "project" : "user";
    let agents = getDetectedAgents();

    if (opts.agent) {
      agents = agents.filter((a) => a.id === opts.agent);
    }

    let removed = 0;
    for (const agent of agents) {
      // Try both as skill and mcp
      if (uninstallFromAgent(agent, slug, "skill", scope)) {
        console.log(`  ✓ ${agent.name}: removed skill`);
        removed++;
      }
      if (uninstallFromAgent(agent, slug, "mcp", scope)) {
        console.log(`  ✓ ${agent.name}: removed MCP config`);
        removed++;
      }
    }

    if (removed === 0) {
      console.log(`"${slug}" not found in any agent.`);
    } else {
      console.log(`\nRemoved from ${removed} location${removed !== 1 ? "s" : ""}.`);
    }
  });

// ============================================
// aria inspect
// ============================================
program
  .command("inspect <id>")
  .description("View full details of an item without installing")
  .action(async (id) => {
    try {
      const skill = (await apiCall(`/api/skills/${id}`)) as RegistrySkill & {
        instructions: string;
        tips: string | null;
        feedback_summary: {
          success_rate: number | null;
          avg_rating: number | null;
          total_uses: number;
          total_feedback: number;
          recent_notes: string[];
        };
      };

      const type = skill.skill_type === "mcp" ? "MCP" : skill.skill_type;
      console.log(`\n${skill.title} [${type}]`);
      console.log("─".repeat(60));
      console.log(skill.description);
      console.log(`\nTeam: ${skill.function_team}`);
      console.log(`Agents: ${skill.agent_compatibility.join(", ")}`);
      if (skill.tags?.length) console.log(`Tags: ${skill.tags.join(", ")}`);
      console.log(`\nRating: ${skill.feedback_summary.avg_rating?.toFixed(1) || "—"}/5`);
      console.log(`Uses: ${skill.feedback_summary.total_uses}`);
      console.log(`Success rate: ${skill.feedback_summary.success_rate != null ? `${(skill.feedback_summary.success_rate * 100).toFixed(0)}%` : "—"}`);
      console.log(`\n${"─".repeat(60)}`);
      console.log("INSTRUCTIONS:\n");
      console.log(skill.instructions);
      if (skill.tips) {
        console.log(`\nTIPS: ${skill.tips}`);
      }
      if (skill.feedback_summary.recent_notes.length > 0) {
        console.log(`\nRECENT FEEDBACK:`);
        skill.feedback_summary.recent_notes.forEach((n) => console.log(`  - ${n}`));
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
    }
  });

// ============================================
// Helpers
// ============================================

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function generateSkillMd(skill: RegistrySkill & { instructions: string; tips: string | null }): string {
  const lines = [
    `---`,
    `name: ${skill.title}`,
    `description: ${skill.description.slice(0, 100)}`,
    `type: ${skill.skill_type}`,
    `source: aria-registry`,
    `agents: ${skill.agent_compatibility.join(", ")}`,
    `tags: ${(skill.tags || []).join(", ")}`,
    `---`,
    ``,
    `# ${skill.title}`,
    ``,
    skill.description,
    ``,
    `## Instructions`,
    ``,
    skill.instructions,
  ];

  if (skill.tips) {
    lines.push(``, `## Tips`, ``, skill.tips);
  }

  return lines.join("\n");
}

function parseMcpConfig(instructions: string): {
  command: string;
  args: string[];
  env?: Record<string, string>;
} {
  // Try to extract install command from instructions
  const npxMatch = instructions.match(/npx\s+([@\w/.-]+(?:\s+[@\w/.-]+)*)/);
  if (npxMatch) {
    return {
      command: "npx",
      args: npxMatch[1].split(/\s+/),
    };
  }

  // Fallback: treat the whole thing as a command
  return {
    command: "npx",
    args: [instructions.split("\n")[0].trim()],
  };
}

program.parse();
