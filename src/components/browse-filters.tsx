"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

const SKILL_TYPES = [
  { value: "", label: "All Types" },
  { value: "prompt", label: "Prompt" },
  { value: "workflow", label: "Workflow" },
  { value: "tool", label: "Tool" },
  { value: "context_pack", label: "Context Pack" },
];

const AGENTS = [
  { value: "", label: "All Agents" },
  { value: "claude_code", label: "Claude Code" },
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

export function BrowseFilters({ teams }: { teams: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      const timeout = setTimeout(() => updateFilter("q", value), 300);
      return () => clearTimeout(timeout);
    },
    [updateFilter]
  );

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={searchParams.get("type") || ""}
        onValueChange={(v) => updateFilter("type", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          {SKILL_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value || "__all__"}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("agent") || ""}
        onValueChange={(v) => updateFilter("agent", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Agents" />
        </SelectTrigger>
        <SelectContent>
          {AGENTS.map((a) => (
            <SelectItem key={a.value} value={a.value || "__all__"}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {teams.length > 0 && (
        <Select
          value={searchParams.get("team") || ""}
          onValueChange={(v) => updateFilter("team", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team} value={team}>
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={searchParams.get("sort") || "newest"}
        onValueChange={(v) => updateFilter("sort", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
