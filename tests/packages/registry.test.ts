import assert from "node:assert/strict";
import test from "node:test";
import { resolvePackageVersion } from "../../src/lib/packages/registry";

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_ORG_ID = "22222222-2222-2222-2222-222222222222";

interface FakeTableData {
  packages: Array<Record<string, unknown>>;
  package_versions: Array<Record<string, unknown>>;
  package_dependencies: Array<Record<string, unknown>>;
}

class FakeQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private limitCount: number | null = null;
  private orderColumn: string | null = null;
  private ascending = true;

  constructor(private rows: Array<Record<string, unknown>>) {}

  select(): FakeQuery {
    return this;
  }

  eq(column: string, value: unknown): FakeQuery {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): FakeQuery {
    this.orderColumn = column;
    this.ascending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): FakeQuery {
    this.limitCount = count;
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: Array<Record<string, unknown>>; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected);
  }

  private result(): { data: Array<Record<string, unknown>>; error: null } {
    let data = this.rows.filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value)
    );

    if (this.orderColumn) {
      data = [...data].sort((a, b) => {
        const left = String(a[this.orderColumn!] ?? "");
        const right = String(b[this.orderColumn!] ?? "");
        return this.ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }

    if (this.limitCount != null) {
      data = data.slice(0, this.limitCount);
    }

    return { data, error: null };
  }
}

function fakeSupabase(data: FakeTableData) {
  return {
    from(table: keyof FakeTableData) {
      return new FakeQuery(data[table]);
    },
  };
}

function packageFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "pkg_create_pptx",
    namespace: "scottliu007",
    slug: "create-pptx",
    name: "create-pptx",
    description: "Create PowerPoint decks from source material.",
    package_type: "skill",
    visibility: "org",
    organization_id: ORG_ID,
    current_version_id: "ver_1_4_2",
    agent_compatibility: ["codex", "claude_code"],
    tags: ["pptx"],
    is_archived: false,
    ...overrides,
  };
}

function versionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "ver_1_4_2",
    package_id: "pkg_create_pptx",
    version: "1.4.2",
    status: "published",
    storage_bucket: "aria-packages",
    storage_prefix: "orgs/org/packages/pkg_create_pptx/versions/1.4.2/",
    manifest_path: "files/aria.json",
    archive_path: "package.zip",
    archive_hash: "sha256:abc",
    content_hash: "sha256:def",
    size_bytes: 1234,
    created_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

test("resolvePackageVersion resolves the current published version", async () => {
  const supabase = fakeSupabase({
    packages: [packageFixture()],
    package_versions: [versionFixture()],
    package_dependencies: [],
  });

  const resolved = await resolvePackageVersion(
    supabase as never,
    ORG_ID,
    "skill",
    "scottliu007/create-pptx",
  );

  assert.equal("error" in resolved, false);
  if ("error" in resolved) return;

  assert.equal(resolved.package.slug, "create-pptx");
  assert.equal(resolved.version.version, "1.4.2");
  assert.equal(resolved.version.archive_path, "package.zip");
});

test("resolvePackageVersion resolves an explicit version", async () => {
  const supabase = fakeSupabase({
    packages: [packageFixture({ current_version_id: "ver_1_4_2" })],
    package_versions: [
      versionFixture({ id: "ver_1_4_2", version: "1.4.2" }),
      versionFixture({ id: "ver_1_3_0", version: "1.3.0" }),
    ],
    package_dependencies: [],
  });

  const resolved = await resolvePackageVersion(
    supabase as never,
    ORG_ID,
    "skill",
    "scottliu007/create-pptx@1.3.0",
  );

  assert.equal("error" in resolved, false);
  if ("error" in resolved) return;

  assert.equal(resolved.version.id, "ver_1_3_0");
  assert.equal(resolved.version.version, "1.3.0");
});

test("resolvePackageVersion rejects ambiguous un-namespaced package refs", async () => {
  const supabase = fakeSupabase({
    packages: [
      packageFixture({ id: "pkg_a", namespace: "team-a" }),
      packageFixture({ id: "pkg_b", namespace: "team-b" }),
    ],
    package_versions: [],
    package_dependencies: [],
  });

  const resolved = await resolvePackageVersion(
    supabase as never,
    ORG_ID,
    "skill",
    "create-pptx",
  );

  assert.deepEqual(resolved, {
    error: "Package name is ambiguous. Use namespace/name.",
    status: 409,
  });
});

test("resolvePackageVersion hides packages from other orgs", async () => {
  const supabase = fakeSupabase({
    packages: [packageFixture({ organization_id: OTHER_ORG_ID, visibility: "org" })],
    package_versions: [versionFixture()],
    package_dependencies: [],
  });

  const resolved = await resolvePackageVersion(
    supabase as never,
    ORG_ID,
    "skill",
    "scottliu007/create-pptx",
  );

  assert.deepEqual(resolved, {
    error: "Package not found",
    status: 404,
  });
});

test("resolvePackageVersion returns dependencies for plugin versions", async () => {
  const supabase = fakeSupabase({
    packages: [
      packageFixture({
        id: "pkg_sales_deck",
        namespace: "acme",
        slug: "sales-deck-workflow",
        name: "sales-deck-workflow",
        package_type: "plugin",
        current_version_id: "ver_plugin_2",
      }),
    ],
    package_versions: [
      versionFixture({
        id: "ver_plugin_2",
        package_id: "pkg_sales_deck",
        version: "2.0.0",
      }),
    ],
    package_dependencies: [
      {
        package_version_id: "ver_plugin_2",
        dependency_type: "skill",
        dependency_ref: "skill/scottliu007/create-pptx@1.4.2",
        version_range: "1.4.2",
        mode: "reference",
        optional: false,
      },
    ],
  });

  const resolved = await resolvePackageVersion(
    supabase as never,
    ORG_ID,
    "plugin",
    "acme/sales-deck-workflow",
  );

  assert.equal("error" in resolved, false);
  if ("error" in resolved) return;

  assert.deepEqual(resolved.dependencies, [
    {
      dependency_type: "skill",
      dependency_ref: "skill/scottliu007/create-pptx@1.4.2",
      version_range: "1.4.2",
      mode: "reference",
      optional: false,
    },
  ]);
});
