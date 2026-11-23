import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getCloudinaryEnv, hasPublicSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const CLOUDINARY_TEMPLATES_FOLDER = "pause/templates";
export const SUPABASE_TEMPLATES_BUCKET = "templates";
export const MAX_TEMPLATE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_TEMPLATE_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedTemplateImageMimeType =
  (typeof ALLOWED_TEMPLATE_IMAGE_MIME_TYPES)[number];

export type TemplateAssetKind = "preview" | "frame";

export interface CloudinarySignedUploadPayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

export interface UploadedTemplateAssetResult {
  url: string;
  storage: "cloudinary" | "supabase";
  publicId?: string;
  path?: string;
}

const MIME_TO_EXTENSION: Record<AllowedTemplateImageMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Checks whether Cloudinary server credentials are configured in the environment.
 */
export function hasCloudinaryConfig(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

/**
 * Validates file MIME type and size (<= 5 MB) for template preview/frame assets.
 */
export function validateTemplateImageMeta(meta: {
  type: string;
  size: number;
}): { ok: true; mimeType: AllowedTemplateImageMimeType } | { ok: false; message: string } {
  const normalizedType = meta.type.toLowerCase().trim();

  if (
    !(ALLOWED_TEMPLATE_IMAGE_MIME_TYPES as readonly string[]).includes(
      normalizedType,
    )
  ) {
    return {
      ok: false,
      message: "Chỉ hỗ trợ định dạng ảnh PNG, JPG hoặc WEBP.",
    };
  }

  if (!Number.isFinite(meta.size) || meta.size <= 0) {
    return {
      ok: false,
      message: "Tệp ảnh trống hoặc không hợp lệ.",
    };
  }

  if (meta.size > MAX_TEMPLATE_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Dung lượng ảnh vượt quá giới hạn tối đa 5 MB.",
    };
  }

  return {
    ok: true,
    mimeType: normalizedType as AllowedTemplateImageMimeType,
  };
}

/**
 * Verifies magic-byte signatures to prevent spoofed Content-Type uploads.
 */
export function validateTemplateImageMagicBytes(
  bytes: Uint8Array,
  mimeType: AllowedTemplateImageMimeType,
): boolean {
  if (bytes.length < 12) return false;

  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/webp") {
    const riff =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    const webp =
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    return riff && webp;
  }

  return false;
}

/**
 * Generates an HMAC/SHA-1 Cloudinary signature from sorted upload parameters.
 */
export function buildCloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && `${value}` !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

/**
 * Signs parameters for a Cloudinary image upload into folder `pause/templates`.
 */
export function signCloudinaryUploadParams(options?: {
  folder?: string;
  timestamp?: number;
}): CloudinarySignedUploadPayload {
  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
  const folder = options?.folder ?? CLOUDINARY_TEMPLATES_FOLDER;
  const timestamp = options?.timestamp ?? Math.floor(Date.now() / 1000);

  const signature = buildCloudinarySignature({ folder, timestamp }, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
  };
}

/**
 * Uploads an image buffer directly to Cloudinary using server-signed upload parameters.
 */
export async function uploadTemplateAssetToCloudinary(options: {
  bytes: Uint8Array;
  mimeType: AllowedTemplateImageMimeType;
  fileName?: string;
}): Promise<UploadedTemplateAssetResult> {
  const signed = signCloudinaryUploadParams({ folder: CLOUDINARY_TEMPLATES_FOLDER });
  const ext = MIME_TO_EXTENSION[options.mimeType];
  const safeName = options.fileName?.trim() || `template-${randomUUID()}.${ext}`;

  const formData = new FormData();
  const blob = new Blob([Uint8Array.from(options.bytes)], { type: options.mimeType });
  formData.append("file", blob, safeName);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("folder", signed.folder);
  formData.append("signature", signed.signature);

  const response = await fetch(signed.uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Cloudinary upload failed (${response.status}): ${errorText || "Unknown error"}`,
    );
  }

  const data = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
  };

  if (!data.secure_url) {
    throw new Error("Cloudinary response did not include secure_url.");
  }

  return {
    url: data.secure_url,
    storage: "cloudinary",
    publicId: data.public_id,
  };
}

/**
 * Fallback upload to the public `templates` bucket in Supabase Storage using the admin JWT.
 */
export async function uploadTemplateAssetToSupabase(options: {
  bytes: Uint8Array;
  mimeType: AllowedTemplateImageMimeType;
  kind?: TemplateAssetKind;
}): Promise<UploadedTemplateAssetResult> {
  if (!hasPublicSupabaseEnv()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const supabase = await createSupabaseServerClient();
  const ext = MIME_TO_EXTENSION[options.mimeType];
  const folder = options.kind === "frame" ? "frames" : "previews";
  const objectPath = `${folder}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_TEMPLATES_BUCKET)
    .upload(objectPath, options.bytes, {
      contentType: options.mimeType,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(SUPABASE_TEMPLATES_BUCKET)
    .getPublicUrl(objectPath);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to resolve public URL for uploaded template asset.");
  }

  return {
    url: urlData.publicUrl,
    storage: "supabase",
    path: objectPath,
  };
}

/**
 * Uploads a validated template image to Cloudinary (preferred) or Supabase Storage `templates` bucket.
 */
export async function uploadTemplateAsset(options: {
  file: File;
  kind?: TemplateAssetKind;
}): Promise<UploadedTemplateAssetResult> {
  const metaCheck = validateTemplateImageMeta({
    type: options.file.type,
    size: options.file.size,
  });
  if (!metaCheck.ok) {
    throw new Error(metaCheck.message);
  }

  const buffer = new Uint8Array(await options.file.arrayBuffer());
  if (!validateTemplateImageMagicBytes(buffer, metaCheck.mimeType)) {
    throw new Error("Nội dung tệp không khớp với định dạng ảnh PNG, JPG hoặc WEBP.");
  }

  if (hasCloudinaryConfig()) {
    return uploadTemplateAssetToCloudinary({
      bytes: buffer,
      mimeType: metaCheck.mimeType,
      fileName: options.file.name,
    });
  }

  return uploadTemplateAssetToSupabase({
    bytes: buffer,
    mimeType: metaCheck.mimeType,
    kind: options.kind,
  });
}
