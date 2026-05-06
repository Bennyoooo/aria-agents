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
  { value: "skill", label: "Skill" },
  { value: "plugin", label: "Plugin" },
  { value: "mcp", label: "MCP" },
  { value: "hook", label: "Hook" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Used" },
  { value: "rating", label: "Highest Rated" },
];

const CATEGORY_RULES = [
  { label: "Document Work", terms: ["doc", "docx", "pdf", "pptx", "xlsx", "slides", "spreadsheet", "coauthor"] },
  { label: "Design & Frontend", terms: ["design", "frontend", "canvas", "theme", "artifact", "web-artifact"] },
  { label: "Engineering", terms: ["api", "mcp", "testing", "webapp", "builder"] },
  { label: "Communication", terms: ["comms", "slack", "gif", "changelog"] },
  { label: "Research & Writing", terms: ["research", "writer", "content"] },
  { label: "Productivity", terms: ["organizer", "connect", "share", "creator"] },
];

type SkillLibraryBrowserProps = {
  mode?: "public" | "console";
};

function getPackageCategory(pkg: PackageSummary) {
  const haystack = [
    pkg.namespace,
    pkg.slug,
    pkg.name,
    pkg.description,
    ...pkg.tags,
  ].join(" ").toLowerCase();

  return CATEGORY_RULES.find((category) => (
    category.terms.some((term) => haystack.includes(term))
  ))?.label ?? "General";
}

function formatSource(source: string) {
  if (source === "__all__") return "All Sources";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function SkillLibraryBrowser({ mode = "public" }: SkillLibraryBrowserProps) {
  const showLegacySkills = mode === "console";
  const [skills, setSkills] = useState<SkillWithStats[]>([]);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [allPackages, setAllPackages] = useState<PackageSummary[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(showLegacySkills);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(showLegacySkills ? "__all__" : "skill");
  const [sourceFilter, setSourceFilter] = useState("__all__");
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [teamFilter, setTeamFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState("newest");

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const applyPackageFilters = useCallback((
    items: PackageSummary[],
    type: string,
    source: string,
    category: string,
  ) => items.filter((pkg) => {
    if (type !== "__all__" && pkg.package_type !== type) return false;
    if (source !== "__all__" && pkg.namespace !== source) return false;
    if (category !== "__all__" && getPackageCategory(pkg) !== category) return false;
    return true;
  }), []);

  const fetchPackages = useCallback(async (
    searchQuery: string,
    type: string,
    source: string,
    category: string,
    sort: string,
  ) => {
    const supabase = createClient();

    let dbQuery = supabase
      .from("packages")
      .select("*")
      .eq("is_archived", false)
      .eq("visibility", "public");

    if (searchQuery) {
      dbQuery = dbQuery.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
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
      const typedPackages = (data || []) as PackageSummary[];
      setAllPackages(typedPackages);
      setPackages(applyPackageFilters(typedPackages, type, source, category));
      setPackageError(null);
    }

    setPackagesLoading(false);
  }, [applyPackageFilters]);

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
    fetchPackages(query, typeFilter, sourceFilter, categoryFilter, sortBy);
    fetchSkills(query, typeFilter, "__all__", teamFilter, sortBy);

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
      fetchPackages(value, typeFilter, sourceFilter, categoryFilter, sortBy);
      fetchSkills(value, typeFilter, "__all__", teamFilter, sortBy);
    }, 300);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newType = key === "type" ? value : typeFilter;
    const newSource = key === "source" ? value : sourceFilter;
    const newCategory = key === "category" ? value : categoryFilter;
    const newTeam = key === "team" ? value : teamFilter;
    const newSort = key === "sort" ? value : sortBy;

    if (key === "type") setTypeFilter(value);
    if (key === "source") setSourceFilter(value);
    if (key === "category") setCategoryFilter(value);
    if (key === "team") setTeamFilter(value);
    if (key === "sort") setSortBy(value);

    fetchPackages(query, newType, newSource, newCategory, newSort);
    fetchSkills(query, newType, "__all__", newTeam, newSort);
  };

  const sourceOptions = ["__all__", ...Array.from(new Set(allPackages.map((pkg) => pkg.namespace))).sort()];
  const categoryOptions = ["__all__", ...Array.from(new Set(allPackages.map((pkg) => getPackageCategory(pkg)))).sort()];
  const isFiltered =
    query ||
    typeFilter !== "skill" ||
    sourceFilter !== "__all__" ||
    categoryFilter !== "__all__" ||
    teamFilter !== "__all__";
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
        {isFiltered ? "No skills match your filters" : "No public skills are available yet."}
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

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <FilterGroup
            title="Source"
            options={sourceOptions.map((source) => ({ value: source, label: formatSource(source) }))}
            value={sourceFilter}
            onChange={(value) => handleFilterChange("source", value)}
          />
          <FilterGroup
            title="Type"
            options={PACKAGE_TYPES}
            value={typeFilter}
            onChange={(value) => handleFilterChange("type", value)}
          />
          <FilterGroup
            title="Category"
            options={categoryOptions.map((category) => ({
              value: category,
              label: category === "__all__" ? "All Categories" : category,
            }))}
            value={categoryFilter}
            onChange={(value) => handleFilterChange("category", value)}
          />
          {showLegacySkills && teams.length > 0 && (
            <FilterGroup
              title="Team"
              options={[
                { value: "__all__", label: "All Teams" },
                ...teams.map((team) => ({ value: team, label: team })),
              ]}
              value={teamFilter}
              onChange={(value) => handleFilterChange("team", value)}
            />
          )}
        </aside>

        <div className="min-w-0 space-y-4">
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
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-mono transition-all ${
              value === option.value
                ? "border-accent/40 bg-accent/20 text-accent-light"
                : "border-transparent text-muted-foreground hover:bg-surface/50 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
