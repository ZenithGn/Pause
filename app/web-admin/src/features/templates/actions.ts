"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { errorResult, okResult, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  hasCloudinaryConfig,
  signCloudinaryUploadParams,
  uploadTemplateAsset,
  validateTemplateImageMagicBytes,
  validateTemplateImageMeta,
  type CloudinarySignedUploadPayload,
  type TemplateAssetKind,
} from "@/lib/cloudinary/sign-upload";
import { isMockAdminMode } from "@/lib/env";
import { ADMIN_ERROR_MESSAGES, mapPostgresError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TemplateDetail } from "@/types/admin";
import type { Json } from "@/types/database";
import { getMockTemplatesStore } from "./mock-store";
import { normalizeLayoutConfig } from "./queries";
import {
  computeSlotCount,
  deleteTemplateSchema,
  setTemplateActiveSchema,
  templateImageMetaSchema,
  upsertTemplateSchema,
  type UpsertTemplateInput,
} from "./schemas";

export async function upsertTemplateAction(
  input: UpsertTemplateInput,
): Promise<ActionResult<TemplateDetail>> {
  await requireAdmin();

  const parsed = upsertTemplateSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return errorResult(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? ADMIN_ERROR_MESSAGES.VALIDATION_ERROR,
      fieldErrors,
    );
  }

  const data = parsed.data;
  const computedSlotCount = computeSlotCount(data.layout_config);
  const normalizedLayout = {
    ...data.layout_config,
    slots: [...data.layout_config.slots].sort((a, b) => a.index - b.index),
  };

  if (isMockAdminMode()) {
    const store = getMockTemplatesStore();
    const duplicate = store.find(
      (item) =>
        item.name.toLowerCase() === data.name.toLowerCase() &&
        item.id !== data.id,
    );
    if (duplicate) {
      return errorResult("TEMPLATE_NAME_TAKEN", ADMIN_ERROR_MESSAGES.TEMPLATE_NAME_TAKEN, {
        name: [ADMIN_ERROR_MESSAGES.TEMPLATE_NAME_TAKEN],
      });
    }

    const now = new Date().toISOString();

    if (data.id) {
      const idx = store.findIndex((item) => item.id === data.id);
      if (idx === -1) {
        return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
      }

      const updated: TemplateDetail = {
        ...store[idx],
        name: data.name,
        category: data.category,
        preview_url: data.preview_url,
        slot_count: computedSlotCount,
        is_premium: data.is_premium,
        is_active: data.is_active,
        layout_config: normalizedLayout,
        updated_at: now,
      };
      store[idx] = updated;
      revalidatePath("/admin/templates");
      revalidatePath(`/admin/templates/${updated.id}`);
      return okResult(updated, "Đã cập nhật template thành công.");
    }

    const created: TemplateDetail = {
      id: randomUUID(),
      name: data.name,
      category: data.category,
      preview_url: data.preview_url,
      slot_count: computedSlotCount,
      is_premium: data.is_premium,
      is_active: data.is_active,
      usage_count: 0,
      layout_config: normalizedLayout,
      created_at: now,
      updated_at: now,
    };
    store.unshift(created);
    revalidatePath("/admin/templates");
    return okResult(created, "Đã tạo template mới thành công.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: rpcRow, error } = await supabase.rpc("admin_upsert_template", {
    p_id: data.id ?? null,
    p_name: data.name,
    p_category: data.category,
    p_preview_url: data.preview_url,
    p_is_premium: data.is_premium,
    p_is_active: data.is_active,
    p_layout_config: normalizedLayout as unknown as Json,
  });

  if (error) {
    if (error.message?.includes("TEMPLATE_NAME_REQUIRED")) {
      return errorResult("VALIDATION_ERROR", "Vui lòng nhập tên template.", {
        name: ["Vui lòng nhập tên template."],
      });
    }
    const mapped = mapPostgresError(error);
    if (mapped.code === "TEMPLATE_NAME_TAKEN") {
      return errorResult(mapped.code, mapped.message, {
        name: [mapped.message],
      });
    }
    if (mapped.code === "INVALID_LAYOUT_CONFIG") {
      return errorResult(mapped.code, mapped.message, {
        layout_config: [mapped.message],
      });
    }
    return errorResult(mapped.code, mapped.message);
  }

  const rowObj = (rpcRow ?? {}) as Record<string, unknown>;
  const savedId = typeof rowObj.id === "string" ? rowObj.id : data.id ?? "";
  const layoutConfig = normalizeLayoutConfig(
    (rowObj.layout_config as Json) ?? (normalizedLayout as unknown as Json),
    computedSlotCount,
  );

  const saved: TemplateDetail = {
    id: savedId,
    name: typeof rowObj.name === "string" ? rowObj.name : data.name,
    category: typeof rowObj.category === "string" ? rowObj.category : data.category,
    preview_url:
      typeof rowObj.preview_url === "string" ? rowObj.preview_url : data.preview_url,
    slot_count:
      typeof rowObj.slot_count === "number" ? rowObj.slot_count : computedSlotCount,
    is_premium:
      typeof rowObj.is_premium === "boolean" ? rowObj.is_premium : data.is_premium,
    is_active:
      typeof rowObj.is_active === "boolean" ? rowObj.is_active : data.is_active,
    usage_count: 0,
    layout_config: layoutConfig,
    created_at:
      typeof rowObj.created_at === "string"
        ? rowObj.created_at
        : new Date().toISOString(),
    updated_at:
      typeof rowObj.updated_at === "string"
        ? rowObj.updated_at
        : new Date().toISOString(),
  };

  revalidatePath("/admin/templates");
  if (savedId) {
    revalidatePath(`/admin/templates/${savedId}`);
  }

  return okResult(
    saved,
    data.id ? "Đã cập nhật template thành công." : "Đã tạo template mới thành công.",
  );
}

export async function setTemplateActiveAction(input: {
  id: string;
  is_active: boolean;
}): Promise<ActionResult<{ id: string; is_active: boolean }>> {
  await requireAdmin();

  const parsed = setTemplateActiveSchema.safeParse(input);
  if (!parsed.success) {
    return errorResult("VALIDATION_ERROR", ADMIN_ERROR_MESSAGES.VALIDATION_ERROR);
  }

  const { id, is_active } = parsed.data;

  if (isMockAdminMode()) {
    const store = getMockTemplatesStore();
    const target = store.find((item) => item.id === id);
    if (!target) {
      return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
    }
    target.is_active = is_active;
    target.updated_at = new Date().toISOString();
    revalidatePath("/admin/templates");
    revalidatePath(`/admin/templates/${id}`);
    return okResult(
      { id, is_active },
      is_active ? "Đã hiển thị template." : "Đã ẩn template.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_template_active", {
    p_id: id,
    p_active: is_active,
  });

  if (error) {
    const mapped = mapPostgresError(error);
    return errorResult(mapped.code, mapped.message);
  }

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);

  return okResult(
    { id, is_active },
    is_active ? "Đã hiển thị template." : "Đã ẩn template.",
  );
}

export async function deleteTemplateAction(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = deleteTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return errorResult("VALIDATION_ERROR", ADMIN_ERROR_MESSAGES.VALIDATION_ERROR);
  }

  const { id } = parsed.data;

  if (isMockAdminMode()) {
    const store = getMockTemplatesStore();
    const idx = store.findIndex((item) => item.id === id);
    if (idx === -1) {
      return errorResult("NOT_FOUND", ADMIN_ERROR_MESSAGES.NOT_FOUND);
    }
    if (store[idx].usage_count > 0) {
      return errorResult("TEMPLATE_IN_USE", ADMIN_ERROR_MESSAGES.TEMPLATE_IN_USE);
    }
    store.splice(idx, 1);
    revalidatePath("/admin/templates");
    return okResult({ id }, "Đã xóa template thành công.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_delete_template", {
    p_id: id,
  });

  if (error) {
    const mapped = mapPostgresError(error);
    return errorResult(mapped.code, mapped.message);
  }

  revalidatePath("/admin/templates");
  return okResult({ id }, "Đã xóa template thành công.");
}

export type UploadStrategyResponse =
  | { mode: "mock" }
  | { mode: "supabase" }
  | ({ mode: "cloudinary" } & CloudinarySignedUploadPayload);

/**
 * Negotiates signed Cloudinary upload params (so files 1–5 MB upload directly without hitting
 * Next.js Server Action payload limits) or signals Supabase/mock fallback.
 */
export async function requestTemplateImageUploadAction(input: {
  fileName: string;
  fileType: string;
  fileSize: number;
  kind?: TemplateAssetKind;
}): Promise<ActionResult<UploadStrategyResponse>> {
  await requireAdmin();

  const parsed = templateImageMetaSchema.safeParse(input);
  if (!parsed.success) {
    return errorResult(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Tệp ảnh không hợp lệ.",
    );
  }

  if (isMockAdminMode()) {
    return okResult({ mode: "mock" });
  }

  if (hasCloudinaryConfig()) {
    const signed = signCloudinaryUploadParams();
    return okResult({
      mode: "cloudinary",
      ...signed,
    });
  }

  return okResult({ mode: "supabase" });
}

/**
 * Server Action image upload handler: validates PNG/JPG/WEBP <= 5 MB and uploads to
 * Cloudinary (`pause/templates`) or falls back to Supabase Storage (`templates` bucket).
 */
export async function uploadTemplateImageAction(
  formData: FormData,
): Promise<ActionResult<{ url: string; storage: "cloudinary" | "supabase" | "mock" }>> {
  await requireAdmin();

  const fileEntry = formData.get("file");
  const kindEntry = formData.get("kind");
  const kind: TemplateAssetKind = kindEntry === "frame" ? "frame" : "preview";

  if (!(fileEntry instanceof File)) {
    return errorResult("VALIDATION_ERROR", "Không tìm thấy tệp ảnh tải lên.");
  }

  const metaCheck = validateTemplateImageMeta({
    type: fileEntry.type,
    size: fileEntry.size,
  });

  if (!metaCheck.ok) {
    return errorResult("VALIDATION_ERROR", metaCheck.message);
  }

  const bytes = new Uint8Array(await fileEntry.arrayBuffer());
  if (!validateTemplateImageMagicBytes(bytes, metaCheck.mimeType)) {
    return errorResult(
      "VALIDATION_ERROR",
      "Nội dung tệp không khớp với định dạng ảnh PNG, JPG hoặc WEBP.",
    );
  }

  if (isMockAdminMode()) {
    if (bytes.byteLength <= 150 * 1024) {
      const base64 = Buffer.from(bytes).toString("base64");
      return okResult(
        {
          url: `data:${metaCheck.mimeType};base64,${base64}`,
          storage: "mock",
        },
        "Đã tải ảnh lên (chế độ mock).",
      );
    }
    const label = encodeURIComponent(fileEntry.name.slice(0, 24) || "Template");
    return okResult(
      {
        url: `https://placehold.co/600x900/630D11/FFFFFF/png?text=${label}`,
        storage: "mock",
      },
      "Đã tạo URL ảnh mẫu (chế độ mock).",
    );
  }

  try {
    const uploaded = await uploadTemplateAsset({
      file: fileEntry,
      kind,
    });

    return okResult(
      {
        url: uploaded.url,
        storage: uploaded.storage,
      },
      uploaded.storage === "cloudinary"
        ? "Đã tải ảnh lên Cloudinary."
        : "Đã tải ảnh lên Supabase Storage.",
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Không thể tải ảnh lên máy chủ. Vui lòng thử lại hoặc dán URL ảnh.";
    return errorResult("INTERNAL_ERROR", message);
  }
}
