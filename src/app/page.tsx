"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { SkillCard } from "@/components/skill-card";
import { PackageCard } from "@/components/package-card";
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
import Link from "next/link";
import { Boxes, Plus, Search } from "lucide-react";
import type { SkillWithStats } from "@/lib/supabase/types";
import type { PackageSummary } from "@/lib/packages/types";

const SKILL_TYPES = [
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

export default function BrowsePage() {
  const [skills, setSkills] = useState<SkillWithStats[]>([]);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
      .eq("is_archived", false);

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
  }, []);

  // Initial load + fetch teams
  useEffect(() => {
    fetchPackages(query, typeFilter, agentFilter, sortBy);
    fetchSkills(query, typeFilter, agentFilter, teamFilter, sortBy);

    const supabase = createClient();
    supabase
      .from("skills")
      .select("function_team")
      .eq("is_hidden", false)
      .then(({ data }) => {
        const uniqueTeams = [...new Set(data?.map((t) => t.function_team).filter(Boolean) || [])];
        setTeams(uniqueTeams);
      });
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPackages(value, typeFilter, agentFilter, sortBy);
      fetchSkills(value, typeFilter, agentFilter, teamFilter, sortBy);
    }, 300);
  };

  // Instant filter changes (no debounce needed for dropdowns)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your team's shared skills, MCPs, agents, and plugins
          </p>
        </div>
        <Link href="/submit" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Skill
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Filters - inline, no URL params */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter === "__all__" ? undefined : typeFilter} onValueChange={(v) => handleFilterChange("type", v ?? "__all__")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {SKILL_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={agentFilter === "__all__" ? undefined : agentFilter} onValueChange={(v) => handleFilterChange("agent", v ?? "__all__")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            {AGENTS.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {teams.length > 0 && (
          <Select value={teamFilter === "__all__" ? undefined : teamFilter} onValueChange={(v) => handleFilterChange("team", v ?? "__all__")}>
            <SelectTrigger className="w-[150px]">
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
        <Select value={sortBy} onValueChange={(v) => handleFilterChange("sort", v ?? "newest")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">
            <Boxes className="mr-2 h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="skills">Legacy Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-4">
          {packagesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : packageError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">Error loading packages: {packageError}</p>
              <p className="text-xs text-muted-foreground mt-1">The package tables may not be migrated in this environment yet.</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground text-lg">
                {isFiltered ? "No packages match your filters" : "No packages yet. Publish a package to browse files and install versions."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive">Error loading skills: {error}</p>
          ) : skills.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground text-lg">
                {isFiltered
                  ? "No skills match your filters"
                  : "No skills yet. Be the first to share something your team uses."}
              </p>
              <Link href="/submit" className={buttonVariants()}>
                <Plus className="mr-2 h-4 w-4" />
                Create the first skill
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
