import { execFileSync } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = request.headers.get("authorization");
  const org = authHeader ? await authenticateApiKey(request) : null;

  const { id } = await params;
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const versions = curlJson<Array<{
    id: string;
    package_id: string;
    storage_bucket: string;
    storage_prefix: string;
  }>>(`/rest/v1/package_versions?select=id,package_id,storage_bucket,storage_prefix&id=eq.${encodeURIComponent(id)}`);
  const version = versions[0];

  if (!version) {
    return NextResponse.json({ error: "Package version not found" }, { status: 404 });
  }

  const packages = curlJson<Array<{
    visibility: string;
    organization_id: string | null;
  }>>(`/rest/v1/packages?select=visibility,organization_id&id=eq.${encodeURIComponent(version.package_id)}`);
  const pkg = packages[0];

  if (!pkg || (pkg.visibility !== "public" && (!org || pkg.organization_id !== org.id))) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const files = curlJson<Array<{
    path: string;
    role: string | null;
    mime_type: string | null;
    previewable: boolean;
    size_bytes: number | null;
  }>>(
    `/rest/v1/package_files?select=path,role,mime_type,previewable,size_bytes&package_version_id=eq.${encodeURIComponent(id)}&path=eq.${encodeURIComponent(path)}&file_type=eq.file`,
  );
  const file = files[0];

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!file.previewable || (file.size_bytes ?? 0) > 500_000) {
    return NextResponse.json({ error: "File is not previewable" }, { status: 415 });
  }

  const objectPath = `${version.storage_prefix}files/${file.path}`;
  const content = curlRaw(`/storage/v1/object/${version.storage_bucket}/${objectPath}`);

  return NextResponse.json({
    path: file.path,
    role: file.role,
    mime_type: file.mime_type,
    content,
  });
}

function curlJson<T>(path: string): T {
  return JSON.parse(curlRaw(path)) as T;
}

function curlRaw(path: string): string {
  return execFileSync("curl", [
    "-sS",
    "--fail-with-body",
    `${SUPABASE_URL}${path}`,
    "-H",
    `apikey: ${SERVICE_KEY}`,
    "-H",
    `Authorization: Bearer ${SERVICE_KEY}`,
  ], {
    encoding: "utf-8",
    maxBuffer: 5 * 1024 * 1024,
  });
}
