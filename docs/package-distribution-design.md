# Aria Package Distribution Design

## Summary

Aria should model skills, MCPs, agents, and plugins as packages. Postgres is the registry and permission layer; object storage is the source of truth for package files.

This avoids forcing folder-shaped packages, such as Anthropic's `pptx` skill, into a single database text field. Users should be able to browse package files in the web UI, while `aria install` downloads an immutable package artifact.

## Package Model

Every package version is a folder with an `aria.json` manifest.

```text
create-pptx/
  aria.json
  README.md
  SKILL.md
  scripts/
  templates/
  examples/
  assets/
```

The manifest is the install contract. It tells Aria what the package is, which file is the entrypoint, which agents support it, what permissions it needs, and whether it references other packages.

Example:

```json
{
  "schemaVersion": "1",
  "type": "skill",
  "name": "create-pptx",
  "version": "1.0.0",
  "title": "Create PPTX",
  "description": "Create polished PowerPoint decks from source material.",
  "entrypoint": "SKILL.md",
  "agents": ["codex", "claude_code", "cursor"],
  "files": ["SKILL.md", "scripts/**", "templates/**", "examples/**"],
  "env": [],
  "permissions": {
    "filesystem": "project",
    "network": false,
    "runsScripts": false
  }
}
```

## Storage Layout

Published package versions are immutable. Never overwrite a published version.

```text
aria-packages/
  orgs/
    {org_id}/
      packages/
        {package_id}/
          versions/
            1.0.0/
              files/
                aria.json
                README.md
                SKILL.md
                scripts/
                templates/
                examples/
                assets/
              package.zip
  public/
    {namespace}/
      {slug}/
        versions/
          1.0.0/
            files/
            package.zip
```

The web UI reads the `files/` object tree for browsing. The CLI downloads `package.zip` for install speed and integrity.

For public packages imported from GitHub or another upstream registry, Aria should mirror the source. Mirroring means Aria makes its own copy of the package files and ZIP artifact at a specific upstream version, usually a Git commit SHA or release tag. The original `source_url` is still stored for attribution and provenance, but installs read from Aria storage instead of fetching GitHub live.

Do not rely on GitHub at install time. Mirroring makes installs durable, fast, reviewable, and reproducible even if the upstream repository moves, deletes files, or changes branch contents.

## Postgres Registry

Postgres stores searchable metadata, ownership, access control, stats, and pointers to storage.

Core tables:

- `packages`: stable package identity and discovery metadata.
- `package_versions`: immutable published/draft versions and storage pointers.
- `package_files`: indexed file tree metadata for browsing.
- `package_dependencies`: references from plugins to skills, MCPs, agents, or other plugins.
- `package_install_events`: install telemetry.

`packages.current_version_id` points to the latest stable version. Installs should pin an exact `package_versions.id` plus content hash.

## Plugin Versioning

A plugin version pins the exact versions of packages it references.

```json
{
  "type": "plugin",
  "name": "sales-deck-workflow",
  "version": "2.0.0",
  "dependencies": [
    {
      "type": "skill",
      "ref": "skill/scottliu007/create-pptx@1.4.2",
      "mode": "reference"
    },
    {
      "type": "mcp",
      "ref": "mcp/anthropic/google-drive@3.1.0",
      "mode": "reference"
    }
  ]
}
```

If `create-pptx` later publishes `1.5.0`, `sales-deck-workflow@2.0.0` still resolves to `create-pptx@1.4.2`. To use the new child package, publish `sales-deck-workflow@2.1.0`.

Plugins can also embed private package folders:

```json
{
  "embedded": [
    {
      "type": "skill",
      "path": "skills/custom-sales-style"
    }
  ]
}
```

References should be the default for reusable packages. Embedding is useful for private bundle-specific content.

## CLI Distribution

Primary syntax:

```bash
aria install skill scottliu007/create-pptx
aria install plugin acme/sales-deck-workflow@2.1.0
aria install mcp anthropic/google-drive
aria install agent support-triage
```

Legacy UUID installs remain supported:

```bash
aria install 3f339c8f-...
```

Install flow:

```text
resolve type/name/version
  -> fetch manifest and package version metadata
  -> check compatibility and permissions
  -> get signed package.zip URL
  -> download and verify hash
  -> extract to temp directory
  -> install through agent adapters
  -> write local install state/lockfile
  -> log install event
```

## Zip Artifacts

Use ZIP files for package install artifacts in v1.

Requirements:

- ZIP must contain `aria.json`.
- Reject absolute paths and `../` path traversal on extraction.
- Extract into a temp directory first.
- Validate manifest before installing.
- Copy only package files into agent directories.
- Verify archive hash when present.
- Do not run package scripts by default.

## Agent Install Targets

Agent-specific adapters own final materialization.

Examples:

```text
Codex project:
  .codex/skills/create-pptx/

Claude global:
  ~/.claude/skills/create-pptx/

MCP config:
  ~/.codex/config.json
  ~/.claude/settings.json
```

MCP config should be generated from manifest `mcpServers`, not regex-parsed from instructions.

## Migration Plan

Phase 1:

- Add package registry tables.
- Add package manifest schema.
- Add resolve/download APIs.
- Add typed `aria install <type> <name>` path.
- Keep legacy `skills` table and UUID install working.

Phase 2:

- Add upload/publish flow.
- Add web file browser from `package_files` and storage object tree.
- Add local lockfiles and update/uninstall based on package version IDs.

Phase 3:

- Add dependency resolution for plugins.
- Add GitHub folder import/mirroring.
- Add archive signing, package diffs, and stronger security review.
