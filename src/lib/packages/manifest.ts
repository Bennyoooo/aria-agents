import { z } from "zod";

export const PACKAGE_TYPES = ["skill", "mcp", "agent", "plugin"] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

const packageReferenceSchema = z.object({
  type: z.enum(PACKAGE_TYPES),
  ref: z.string().min(1),
  mode: z.enum(["reference", "embedded"]).default("reference"),
  optional: z.boolean().default(false),
});

export const ariaPackageManifestSchema = z.object({
  schemaVersion: z.string().default("1"),
  type: z.enum(PACKAGE_TYPES),
  name: z.string().min(1),
  namespace: z.string().optional(),
  version: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  entrypoint: z.string().default("SKILL.md"),
  agents: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  dependencies: z.array(packageReferenceSchema).default([]),
  embedded: z.array(z.object({
    type: z.enum(PACKAGE_TYPES),
    path: z.string().min(1),
  })).default([]),
  mcpServers: z.record(z.string(), z.object({
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).optional(),
  })).default({}),
  env: z.array(z.object({
    name: z.string().min(1),
    required: z.boolean().default(false),
    description: z.string().optional(),
  })).default([]),
  permissions: z.object({
    filesystem: z.enum(["none", "project", "user"]).default("none"),
    network: z.boolean().default(false),
    runsScripts: z.boolean().default(false),
  }).default({
    filesystem: "none",
    network: false,
    runsScripts: false,
  }),
});

export type AriaPackageManifest = z.infer<typeof ariaPackageManifestSchema>;

export function parsePackageRef(input: string): {
  namespace?: string;
  slug: string;
  version?: string;
} {
  const [namePart, version] = input.split("@", 2);
  const pieces = namePart.split("/").filter(Boolean);

  if (pieces.length === 1) {
    return { slug: pieces[0], version };
  }

  return {
    namespace: pieces[0],
    slug: pieces.slice(1).join("/"),
    version,
  };
}

export function isPackageType(value: string): value is PackageType {
  return (PACKAGE_TYPES as readonly string[]).includes(value);
}
