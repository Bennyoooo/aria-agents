import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    name: "Aria - Self-evolving AI knowledge platform",
    endpoints: {
      search: "POST /api/skills/search",
      get: "GET /api/skills/:id",
      invoke: "POST /api/skills/:id/invoke",
      feedback: "POST /api/skills/:id/feedback",
      export: "GET /api/skills/export",
      import: "POST /api/skills/import",
    },
    mcp: {
      tools: ["search_skills", "get_skill", "invoke_skill", "log_feedback"],
      install: "npx aria-skills",
    },
  });
}
