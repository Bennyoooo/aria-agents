import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface AgentConfig {
  name: string;
  id: string;
  userSkillsDir: string;
  projectSkillsDir: string;
  userConfigFile: string;
  projectConfigFile: string;
  detected: boolean;
}

const HOME = homedir();

const AGENT_DEFINITIONS: Omit<AgentConfig, "detected">[] = [
  {
    name: "Claude Code",
    id: "claude_code",
    userSkillsDir: join(HOME, ".claude", "skills"),
    projectSkillsDir: join(".claude", "skills"),
    userConfigFile: join(HOME, ".claude", "settings.json"),
    projectConfigFile: join(".claude", "settings.json"),
  },
  {
    name: "OpenCode",
    id: "opencode",
    userSkillsDir: join(HOME, ".opencode", "skills"),
    projectSkillsDir: join(".opencode", "skills"),
    userConfigFile: join(HOME, ".opencode", "config.json"),
    projectConfigFile: join(".opencode", "config.json"),
  },
  {
    name: "Cursor",
    id: "cursor",
    userSkillsDir: join(HOME, ".cursor", "skills"),
    projectSkillsDir: join(".cursor", "skills"),
    userConfigFile: join(HOME, ".cursor", "settings.json"),
    projectConfigFile: join(".cursor", "settings.json"),
  },
  {
    name: "Codex",
    id: "codex",
    userSkillsDir: join(HOME, ".codex", "skills"),
    projectSkillsDir: join(".codex", "skills"),
    userConfigFile: join(HOME, ".codex", "config.json"),
    projectConfigFile: join(".codex", "config.json"),
  },
];

export function detectAgents(): AgentConfig[] {
  return AGENT_DEFINITIONS.map((agent) => ({
    ...agent,
    detected:
      existsSync(join(HOME, `.${agent.id === "claude_code" ? "claude" : agent.id}`)) ||
      existsSync(agent.userConfigFile),
  }));
}

export function getDetectedAgents(): AgentConfig[] {
  return detectAgents().filter((a) => a.detected);
}

export function installSkillToAgent(
  agent: AgentConfig,
  slug: string,
  skillMd: string,
  scope: "user" | "project"
): string {
  const skillsDir =
    scope === "project" ? agent.projectSkillsDir : agent.userSkillsDir;
  const targetDir = join(skillsDir, slug);

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, "SKILL.md"), skillMd);

  return targetDir;
}

export function installPackageDirectoryToAgent(
  agent: AgentConfig,
  slug: string,
  packageDir: string,
  scope: "user" | "project"
): string {
  const skillsDir =
    scope === "project" ? agent.projectSkillsDir : agent.userSkillsDir;
  const targetDir = join(skillsDir, slug);

  mkdirSync(skillsDir, { recursive: true });
  cpSync(packageDir, targetDir, { recursive: true, force: true });

  return targetDir;
}

export function installMcpToAgent(
  agent: AgentConfig,
  slug: string,
  mcpConfig: { command: string; args: string[]; env?: Record<string, string> },
  scope: "user" | "project"
): string {
  const configFile =
    scope === "project" ? agent.projectConfigFile : agent.userConfigFile;

  let config: Record<string, unknown> = {};
  if (existsSync(configFile)) {
    try {
      config = JSON.parse(readFileSync(configFile, "utf-8"));
    } catch {
      config = {};
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }

  (config.mcpServers as Record<string, unknown>)[slug] = mcpConfig;

  mkdirSync(join(configFile, ".."), { recursive: true });
  writeFileSync(configFile, JSON.stringify(config, null, 2));

  return configFile;
}

export function uninstallFromAgent(
  agent: AgentConfig,
  slug: string,
  type: "skill" | "mcp" | "agent" | "plugin",
  scope: "user" | "project"
): boolean {
  if (type === "mcp") {
    const configFile =
      scope === "project" ? agent.projectConfigFile : agent.userConfigFile;
    if (!existsSync(configFile)) return false;

    try {
      const config = JSON.parse(readFileSync(configFile, "utf-8"));
      if (config.mcpServers?.[slug]) {
        delete config.mcpServers[slug];
        writeFileSync(configFile, JSON.stringify(config, null, 2));
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  const skillsDir =
    scope === "project"
      ? agent.projectSkillsDir
      : agent.userSkillsDir;
  const targetDir = join(skillsDir, slug);

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true });
    return true;
  }
  return false;
}
