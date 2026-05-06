"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Boxes, Plus, Search } from "lucide-react";
import { PackageCard } from "@/components/package-card";
import { SkillCard } from "@/components/skill-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { PackageSummary } from "@/lib/packages/types";
import type { SkillWithStats } from "@/lib/supabase/types";

const PACKAGE_TYPES = [
  { value: "__all__", label: "All Types" },
  { value: "skill", label: "Skill" },
  { value: "mcp", label: "MCP" },
  { value: "agent", label: "Agent" },
  { value: "plugin", label: "Plugin" },
];

const AGENTS = [
  { value: "__all__", label: "All Agents" },
  { value: "claude_code", label: "Claude Code" },
  { value: "opencode", label: "OpenCode / OpenWork" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "copilot", label: "Copilot" },
  { value: "gemini", label: "Gemini" },
  { value: "codex", label: "Codex" },
  { value: "cursor", label: "Cursor" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Used" },
  { value: "rating", label: "Highest Rated" },
];

type SkillLibraryBrowserProps = {
  mode?: "public" | "console";
};

export function SkillLibraryBrowser({ mode = "public" }: SkillLibraryBrowserProps) {
  const showLegacySkills = mode === "console";
  const [skills, setSkills] = useState<SkillWithStats[]>([]);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(showLegacySkills);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [agentFilter, setAgentFilter] = useState("__all__");
  const [teamFilter, setTeamFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState("newest");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPackages = useCallback(async (searchQuery: string, type: string, agent: string, sort: string) => {
    const supabase = createClient();

    let dbQuery = supabase
      .from("packages")
      .select("*")
      .eq("is_archived", false)
      .eq("visibility", "public");

    if (searchQuery) {
      dbQuery = dbQuery.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    if (type && type !== "__all__") {
      dbQuery = dbQuery.eq("package_type", type);
    }
    if (agent && agent !== "__all__") {
      dbQuery = dbQuery.contains("agent_compatibility", [agent]);
    }

    if (sort === "newest") {
      dbQuery = dbQuery.order("updated_at", { ascending: false });
    } else {
      dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    const { data, error: fetchError } = await dbQuery.limit(50);

    if (fetchError) {
      setPackageError(fetchError.message);
    } else {
      setPackages((data || []) as PackageSummary[]);
      setPackageError(null);
    }

    setPackagesLoading(false);
  }, []);

  const fetchSkills = useCallback(async (searchQuery: string, type: string, agent: string, team: string, sort: string) => {
    if (!showLegacySkills) return;

    const supabase = createClient();

    let dbQuery = supabase
      .from("skills_with_stats")
      .select("*")
      .eq("is_hidden", false);

    if (searchQuery) {
      dbQuery = dbQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    if (type && type !== "__all__") {
      dbQuery = dbQuery.eq("skill_type", type);
    }
    if (agent && agent !== "__all__") {
      dbQuery = dbQuery.contains("agent_compatibility", [agent]);
    }
    if (team && team !== "__all__") {
      dbQuery = dbQuery.eq("function_team", team);
    }

    if (sort === "rating") {
      dbQuery = dbQuery.order("avg_rating", { ascending: false, nullsFirst: false });
    } else if (sort === "popular") {
      dbQuery = dbQuery.order("use_count", { ascending: false });
    } else {
      dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    const { data, error: fetchError } = await dbQuery.limit(50);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setSkills(data || []);
      setError(null);
    }

    setLoading(false);
  }, [showLegacySkills]);

  useEffect(() => {
    fetchPackages(query, typeFilter, agentFilter, sortBy);
    fetchSkills(query, typeFilter, agentFilter, teamFilter, sortBy);

    if (showLegacySkills) {
      const supabase = createClient();
      supabase
        .from("skills")
        .select("function_team")
        .eq("is_hidden", false)
        .then(({ data }) => {
          const uniqueTeams = [...new Set(data?.map((team) => team.function_team).filter(Boolean) || [])];
          setTeams(uniqueTeams);
        });
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPackages(value, typeFilter, agentFilter, sortBy);
      fetchSkills(value, typeFilter, agentFilter, teamFilter, sortBy);
    }, 300);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newType = key === "type" ? value : typeFilter;
    const newAgent = key === "agent" ? value : agentFilter;
    const newTeam = key === "team" ? value : teamFilter;
    const newSort = key === "sort" ? value : sortBy;

    if (key === "type") setTypeFilter(value);
    if (key === "agent") setAgentFilter(value);
    if (key === "team") setTeamFilter(value);
    if (key === "sort") setSortBy(value);

    fetchPackages(query, newType, newAgent, newSort);
    fetchSkills(query, newType, newAgent, newTeam, newSort);
  };

  const isFiltered = query || typeFilter !== "__all__" || agentFilter !== "__all__" || teamFilter !== "__all__";
  const packageGrid = packagesLoading ? (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  ) : packageError ? (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-destructive">Error loading packages: {packageError}</p>
      <p className="mt-1 text-xs text-muted-foreground">The package tables may not be migrated in this environment yet.</p>
    </div>
  ) : packages.length === 0 ? (
    <div className="py-16 text-center">
      <p className="text-lg text-muted-foreground">
        {isFiltered ? "No packages match your filters" : "No public packages are available yet."}
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {mode === "console" && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Console</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your team&apos;s skills, MCPs, agents, and plugins.
            </p>
          </div>
          <Link href="/submit" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Skill
          </Link>
        </div>
      )}

      {mode === "console" && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{packages.length}</div>
            <p className="text-xs text-muted-foreground">Packages</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{skills.length}</div>
            <p className="text-xs text-muted-foreground">Legacy Skills</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{packages.filter((pkg) => pkg.package_type === "plugin").length}</div>
            <p className="text-xs text-muted-foreground">Plugins</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold">{packages.filter((pkg) => pkg.current_version_id).length}</div>
            <p className="text-xs text-muted-foreground">Versioned</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search public skills..."
            value={query}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter === "__all__" ? undefined : typeFilter} onValueChange={(value) => handleFilterChange("type", value ?? "__all__")}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {PACKAGE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={agentFilter === "__all__" ? undefined : agentFilter} onValueChange={(value) => handleFilterChange("agent", value ?? "__all__")}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            {AGENTS.map((agent) => (
              <SelectItem key={agent.value} value={agent.value}>{agent.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showLegacySkills && teams.length > 0 && (
          <Select value={teamFilter === "__all__" ? undefined : teamFilter} onValueChange={(value) => handleFilterChange("team", value ?? "__all__")}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>{team}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={(value) => handleFilterChange("sort", value ?? "newest")}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((sort) => (
              <SelectItem key={sort.value} value={sort.value}>{sort.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showLegacySkills ? (
        <Tabs defaultValue="packages">
          <TabsList>
            <TabsTrigger value="packages">
              <Boxes className="mr-2 h-4 w-4" />
              Packages
            </TabsTrigger>
            <TabsTrigger value="skills">Legacy Skills</TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="mt-4">
            {packageGrid}
          </TabsContent>

          <TabsContent value="skills" className="mt-4">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : error ? (
              <p className="text-destructive">Error loading skills: {error}</p>
            ) : skills.length === 0 ? (
              <div className="space-y-4 py-16 text-center">
                <p className="text-lg text-muted-foreground">
                  {isFiltered
                    ? "No skills match your filters"
                    : "No legacy skills yet. Use packages for new public skills."}
                </p>
                <Link href="/submit" className={buttonVariants()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Skill
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {skills.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        packageGrid
      )}
    </div>
  );
}
