// FR-02 / T-02.05 – thumbnail generation Edge Function (backfill / server-side path).
//
// The Android client already generates thumbnails before upload
// (data/media/AndroidPhotoProcessor.kt) because it saves Supabase egress and CPU
// for the 256 MB drawer quota. This function exists for server-side backfill of
// photos uploaded by other clients (web/admin) and for re-generating thumbnails
// after a pipeline change.
//
// POST /functions/v1/create-thumbnail
//   body: { "drawerId": "<uuid>", "limit": 20 }
//   auth: caller JWT (drawer owner or edit share) OR service role
//
// NOTE: not executed in CI/local validation (no Deno runtime in the dev box);
// kept small and dependency-light so it can be verified with `supabase functions serve`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const THUMBNAIL_EDGE_PX = 480;
const THUMBNAIL_QUALITY = 70;

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "missing Supabase environment variables" }, 500);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const bearer = authorization.replace("Bearer ", "");
  const isServiceRole = bearer === serviceRoleKey;

  const body = await safeJson(request);
  const drawerId = body?.drawerId as string | undefined;
  const limit = Math.min(Number(body?.limit ?? 20), 100);
  if (!drawerId) return json({ error: "drawerId is required" }, 400);

  // User-scoped client for the access check (RLS), admin client for writes.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (!isServiceRole) {
    const { data: drawer, error } = await userClient
      .from("drawers")
      .select("id")
      .eq("id", drawerId)
      .maybeSingle();
    if (error || !drawer) return json({ error: "drawer not accessible" }, 403);
  }

  const { data: photos, error: photosError } = await admin
    .from("photos")
    .select("id, original_url, thumbnail_url, mime_type")
    .eq("drawer_id", drawerId)
    .is("thumbnail_url", null)
    .limit(limit);

  if (photosError) return json({ error: photosError.message }, 500);
  if (!photos?.length) return json({ processed: 0 });

  const processed: string[] = [];
  const failures: Array<{ id: string; reason: string }> = [];

  for (const photo of photos) {
    try {
      const { data: blob, error: downloadError } = await admin.storage
        .from("photos")
        .download(photo.original_url as string);
      if (downloadError || !blob) throw new Error(downloadError?.message ?? "download failed");

      const image = await Image.decode(new Uint8Array(await blob.arrayBuffer()));
      const scale = THUMBNAIL_EDGE_PX / Math.max(image.width, image.height);
      if (scale < 1) image.resize(THUMBNAIL_EDGE_PX, Math.round(image.height * scale));

      const encoded = await image.encodeJPEG(THUMBNAIL_QUALITY);
      const thumbnailPath = `${drawerId}/${photo.id}_thumb.jpg`;

      const { error: uploadError } = await admin.storage
        .from("thumbnails")
        .upload(thumbnailPath, encoded, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await admin
        .from("photos")
        .update({ thumbnail_url: thumbnailPath })
        .eq("id", photo.id);
      if (updateError) throw new Error(updateError.message);

      processed.push(photo.id as string);
    } catch (error) {
      failures.push({ id: photo.id as string, reason: String(error) });
    }
  }

  return json({ processed: processed.length, failures });
});

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
