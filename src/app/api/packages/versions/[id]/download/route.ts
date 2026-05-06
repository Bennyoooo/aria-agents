import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateApiKey } from "@/lib/supabase/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: version, error: versionError } = await supabase
    .from("package_versions")
    .select("id, package_id, version, storage_bucket, archive_path, archive_hash, content_hash, size_bytes")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: "Package version not found" }, { status: 404 });
  }

  const { data: pkg, error: packageError } = await supabase
    .from("packages")
    .select("id, namespace, slug, name, package_type, visibility, organization_id")
    .eq("id", version.package_id)
    .single();

  if (packageError || !pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  if (pkg.visibility !== "public" && pkg.organization_id !== org.id) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  if (!version.archive_path) {
    return NextResponse.json(
      { error: "Package archive is not available for this version" },
      { status: 409 },
    );
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(version.storage_bucket)
    .createSignedUrl(version.archive_path, 60 * 10);

  if (signedUrlError || !signedUrl?.signedUrl) {
    return NextResponse.json(
      { error: signedUrlError?.message || "Could not create download URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    package: pkg,
    version: {
      id: version.id,
      version: version.version,
      archive_hash: version.archive_hash,
      content_hash: version.content_hash,
      size_bytes: version.size_bytes,
    },
    download_url: signedUrl.signedUrl,
    expires_in: 60 * 10,
  });
}
