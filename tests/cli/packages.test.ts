import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import AdmZip from "../../cli/node_modules/adm-zip";
import {
  downloadAndExtractPackage,
  isSafePackagePath,
  parsePackageSpecifier,
} from "../../cli/src/packages";

test("parsePackageSpecifier supports unversioned and versioned refs", () => {
  assert.deepEqual(parsePackageSpecifier("scottliu007/create-pptx"), {
    name: "scottliu007/create-pptx",
    version: undefined,
  });

  assert.deepEqual(parsePackageSpecifier("scottliu007/create-pptx@1.2.3"), {
    name: "scottliu007/create-pptx",
    version: "1.2.3",
  });
});

test("downloadAndExtractPackage extracts a valid package ZIP and reads aria.json", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aria-package-test-"));
  const zipPath = join(dir, "package.zip");

  try {
    const zip = new AdmZip();
    zip.addFile("aria.json", Buffer.from(JSON.stringify({
      type: "skill",
      name: "create-pptx",
      version: "1.0.0",
      entrypoint: "SKILL.md",
    })));
    zip.addFile("SKILL.md", Buffer.from("# Create PPTX\n"));
    zip.writeZip(zipPath);

    const { packageDir, manifest } = await downloadAndExtractPackage({
      package: {
        id: "pkg_1",
        namespace: "scottliu007",
        slug: "create-pptx",
        name: "create-pptx",
        package_type: "skill",
      },
      version: {
        id: "ver_1",
        version: "1.0.0",
        archive_hash: null,
        content_hash: null,
        size_bytes: null,
      },
      download_url: `data:application/zip;base64,${readFileSync(zipPath).toString("base64")}`,
      expires_in: 600,
    });

    assert.equal(manifest.type, "skill");
    assert.equal(manifest.name, "create-pptx");
    assert.equal(manifest.version, "1.0.0");
    assert.equal(readFileSync(join(packageDir, "SKILL.md"), "utf-8"), "# Create PPTX\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("isSafePackagePath rejects path traversal and absolute paths", () => {
  assert.equal(isSafePackagePath("aria.json"), true);
  assert.equal(isSafePackagePath("skills/pptx/SKILL.md"), true);
  assert.equal(isSafePackagePath("../escape.txt"), false);
  assert.equal(isSafePackagePath("skills/../../escape.txt"), false);
  assert.equal(isSafePackagePath("/tmp/escape.txt"), false);
});

test("downloadAndExtractPackage rejects packages without aria.json", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aria-package-test-"));
  const zipPath = join(dir, "package.zip");

  try {
    await mkdir(join(dir, "nested"));
    await writeFile(join(dir, "nested", "README.md"), "# Missing manifest\n");

    const zip = new AdmZip();
    zip.addFile("README.md", Buffer.from("# Missing manifest\n"));
    zip.writeZip(zipPath);

    await assert.rejects(
      () => downloadAndExtractPackage({
        package: {
          id: "pkg_missing",
          namespace: "test",
          slug: "missing",
          name: "missing",
          package_type: "skill",
        },
        version: {
          id: "ver_missing",
          version: "1.0.0",
          archive_hash: null,
          content_hash: null,
          size_bytes: null,
        },
        download_url: `data:application/zip;base64,${readFileSync(zipPath).toString("base64")}`,
        expires_in: 600,
      }),
      /aria\.json/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
