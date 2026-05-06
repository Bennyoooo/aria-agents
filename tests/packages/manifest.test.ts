import assert from "node:assert/strict";
import test from "node:test";
import {
  ariaPackageManifestSchema,
  isPackageType,
  parsePackageRef,
} from "../../src/lib/packages/manifest";

test("parsePackageRef handles slug-only package refs", () => {
  assert.deepEqual(parsePackageRef("create-pptx"), {
    slug: "create-pptx",
    version: undefined,
  });
});

test("parsePackageRef handles namespace and version", () => {
  assert.deepEqual(parsePackageRef("scottliu007/create-pptx@1.4.2"), {
    namespace: "scottliu007",
    slug: "create-pptx",
    version: "1.4.2",
  });
});

test("manifest schema applies safe defaults for a minimal skill package", () => {
  const manifest = ariaPackageManifestSchema.parse({
    type: "skill",
    name: "create-pptx",
    version: "1.0.0",
  });

  assert.equal(manifest.schemaVersion, "1");
  assert.equal(manifest.entrypoint, "SKILL.md");
  assert.deepEqual(manifest.agents, []);
  assert.deepEqual(manifest.files, []);
  assert.deepEqual(manifest.dependencies, []);
  assert.deepEqual(manifest.permissions, {
    filesystem: "none",
    network: false,
    runsScripts: false,
  });
});

test("manifest schema supports plugin references and embedded packages", () => {
  const manifest = ariaPackageManifestSchema.parse({
    type: "plugin",
    name: "sales-deck-workflow",
    version: "2.0.0",
    dependencies: [
      {
        type: "skill",
        ref: "skill/scottliu007/create-pptx@1.4.2",
      },
      {
        type: "mcp",
        ref: "mcp/anthropic/google-drive@3.1.0",
        optional: true,
      },
    ],
    embedded: [
      {
        type: "skill",
        path: "skills/custom-sales-style",
      },
    ],
  });

  assert.equal(manifest.dependencies[0].mode, "reference");
  assert.equal(manifest.dependencies[0].optional, false);
  assert.equal(manifest.dependencies[1].optional, true);
  assert.deepEqual(manifest.embedded, [
    {
      type: "skill",
      path: "skills/custom-sales-style",
    },
  ]);
});

test("manifest schema rejects unknown package types", () => {
  assert.throws(() =>
    ariaPackageManifestSchema.parse({
      type: "tool",
      name: "legacy-tool",
      version: "1.0.0",
    })
  );
});

test("isPackageType narrows supported package type strings", () => {
  assert.equal(isPackageType("skill"), true);
  assert.equal(isPackageType("mcp"), true);
  assert.equal(isPackageType("plugin"), true);
  assert.equal(isPackageType("tool"), false);
});
