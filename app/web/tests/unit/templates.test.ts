import { createHash } from "node:crypto";
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import {
  MobileTemplatePreview,
  VisualLayoutEditor,
} from "@/features/templates/components";
import {
  TEMPLATE_PRESETS,
  buildLayoutFromPreset,
  clampSlotToCanvas,
  reindexSlots,
  snapToGrid,
  validateLayoutJsonWithLines,
} from "@/features/templates/layout";
import { normalizeLayoutConfig } from "@/features/templates/queries";
import {
  computeSlotCount,
  layoutConfigSchema,
  templateImageMetaSchema,
  upsertTemplateSchema,
} from "@/features/templates/schemas";

vi.mock("server-only", () => ({}));

import {
  CLOUDINARY_TEMPLATES_FOLDER,
  MAX_TEMPLATE_IMAGE_BYTES,
  buildCloudinarySignature,
  hasCloudinaryConfig,
  signCloudinaryUploadParams,
  validateTemplateImageMagicBytes,
  validateTemplateImageMeta,
} from "@/lib/cloudinary/sign-upload";

describe("FR-06.2 layoutConfigSchema", () => {
  const validBaseLayout = {
    width: 1200,
    height: 1800,
    background_color: "#FFFFFF",
    slots: [
      { index: 0, x: 60, y: 120, width: 1080, height: 700 },
      { index: 1, x: 60, y: 900, width: 1080, height: 700 },
    ],
    texts: [{ content: "Pause", x: 600, y: 1700, font_size: 48, color: "#111111" }],
    frame_url: "https://res.cloudinary.com/demo/image/upload/v1/pause/templates/frame.png",
  };

  it("accepts a valid layout_config and computes slot_count from slots.length", () => {
    const parsed = layoutConfigSchema.safeParse(validBaseLayout);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(computeSlotCount(parsed.data)).toBe(2);
      expect(parsed.data.texts).toHaveLength(1);
      expect(parsed.data.frame_url).toBe(validBaseLayout.frame_url);
    }
  });

  it("defaults optional texts to [] and empty/omitted frame_url to null", () => {
    const parsed = layoutConfigSchema.safeParse({
      width: 1200,
      height: 1500,
      background_color: "#f6efe4",
      slots: [{ index: 0, x: 0, y: 0, width: 1200, height: 1500 }],
      frame_url: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.texts).toEqual([]);
      expect(parsed.data.frame_url).toBeNull();
      expect(computeSlotCount(parsed.data)).toBe(1);
    }
  });

  it("allows exact canvas edge boundaries (x + width === width, y + height === height)", () => {
    const parsed = layoutConfigSchema.safeParse({
      width: 1000,
      height: 1500,
      background_color: "#111111",
      slots: [{ index: 0, x: 200, y: 300, width: 800, height: 1200 }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects non-positive canvas dimensions", () => {
    expect(
      layoutConfigSchema.safeParse({ ...validBaseLayout, width: 0 }).success,
    ).toBe(false);
    expect(
      layoutConfigSchema.safeParse({ ...validBaseLayout, height: -100 }).success,
    ).toBe(false);
  });

  it("rejects empty slots array", () => {
    const res = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      slots: [],
    });
    expect(res.success).toBe(false);
  });

  it("rejects out-of-bounds slots (negative origin or exceeding canvas width/height)", () => {
    const negativeX = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      slots: [{ index: 0, x: -1, y: 0, width: 500, height: 500 }],
    });
    expect(negativeX.success).toBe(false);

    const overflowWidth = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      slots: [{ index: 0, x: 200, y: 100, width: 1001, height: 500 }],
    });
    expect(overflowWidth.success).toBe(false);
    if (!overflowWidth.success) {
      expect(overflowWidth.error.issues.some((i) => i.path.join(".") === "slots.0.width")).toBe(
        true,
      );
    }

    const overflowHeight = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      slots: [{ index: 0, x: 100, y: 1000, width: 500, height: 801 }],
    });
    expect(overflowHeight.success).toBe(false);
    if (!overflowHeight.success) {
      expect(
        overflowHeight.error.issues.some((i) => i.path.join(".") === "slots.0.height"),
      ).toBe(true);
    }
  });

  it("rejects duplicate and non-contiguous slot indices", () => {
    const duplicate = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      slots: [
        { index: 0, x: 60, y: 100, width: 500, height: 400 },
        { index: 0, x: 60, y: 600, width: 500, height: 400 },
      ],
    });
    expect(duplicate.success).toBe(false);

    const nonContiguous = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      slots: [
        { index: 0, x: 60, y: 100, width: 500, height: 400 },
        { index: 2, x: 60, y: 600, width: 500, height: 400 },
      ],
    });
    expect(nonContiguous.success).toBe(false);

    const oneBased = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      slots: [
        { index: 1, x: 60, y: 100, width: 500, height: 400 },
        { index: 2, x: 60, y: 600, width: 500, height: 400 },
      ],
    });
    expect(oneBased.success).toBe(false);
  });

  it("enforces strict #RRGGBB hex color format for background_color and texts[].color", () => {
    expect(
      layoutConfigSchema.safeParse({
        ...validBaseLayout,
        background_color: "#abc123",
      }).success,
    ).toBe(true);

    for (const badColor of ["#FFF", "FFFFFF", "#12345G", "#11223344", "red"]) {
      expect(
        layoutConfigSchema.safeParse({
          ...validBaseLayout,
          background_color: badColor,
        }).success,
      ).toBe(false);

      expect(
        layoutConfigSchema.safeParse({
          ...validBaseLayout,
          texts: [{ content: "Hi", x: 100, y: 100, font_size: 32, color: badColor }],
        }).success,
      ).toBe(false);
    }
  });

  it("rejects unsafe frame_url protocols", () => {
    const res = layoutConfigSchema.safeParse({
      ...validBaseLayout,
      frame_url: "javascript:alert(1)",
    });
    expect(res.success).toBe(false);
  });
});

describe("FR-06.2 presets & layout geometry helpers", () => {
  it("builds valid layouts for all 4 built-in presets with matching slot counts", () => {
    expect(TEMPLATE_PRESETS.map((p) => p.id)).toEqual([
      "strip-4",
      "grid-2x2",
      "polaroid-1",
      "duo-2",
    ]);

    for (const preset of TEMPLATE_PRESETS) {
      const built = buildLayoutFromPreset(preset.id);
      const checked = layoutConfigSchema.safeParse(built);
      expect(checked.success).toBe(true);
      expect(computeSlotCount(built)).toBe(preset.slotCount);
    }
  });

  it("preserves frame_url when switching presets and returns isolated clones", () => {
    const frameUrl = "https://res.cloudinary.com/demo/image/upload/frame.png";
    const first = buildLayoutFromPreset("grid-2x2", frameUrl);
    const second = buildLayoutFromPreset("grid-2x2");
    first.slots[0].x = 999;

    expect(first.frame_url).toBe(frameUrl);
    expect(second.frame_url).toBeNull();
    expect(second.slots[0].x).not.toBe(999);
  });

  it("reindexes slots sequentially 0..n-1", () => {
    const reindexed = reindexSlots([
      { index: 4, x: 10, y: 10, width: 100, height: 100 },
      { index: 9, x: 200, y: 10, width: 100, height: 100 },
    ]);
    expect(reindexed.map((s) => s.index)).toEqual([0, 1]);
  });

  it("snaps coordinates to 10px grid and clamps slots inside canvas", () => {
    expect(snapToGrid(44)).toBe(40);
    expect(snapToGrid(46)).toBe(50);

    const clamped = clampSlotToCanvas(
      { index: 0, x: 1000, y: 1600, width: 500, height: 400 },
      1200,
      1800,
    );
    expect(clamped.x).toBe(700);
    expect(clamped.y).toBe(1400);
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1200);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(1800);
  });
});

describe("FR-06.2 JSON editor line-mapped validation", () => {
  it("reports line number on JSON syntax error", () => {
    const badJson = `{\n  "width": 1200,\n  "height": \n}`;
    const res = validateLayoutJsonWithLines(badJson);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.errors[0].path).toBe("JSON");
      expect(res.errors[0].line).toBeGreaterThanOrEqual(1);
    }
  });

  it("maps Zod schema issues to the exact JSON line", () => {
    const jsonWithOverflow = JSON.stringify(
      {
        width: 1200,
        height: 1800,
        background_color: "#FFF",
        slots: [
          { index: 0, x: 60, y: 60, width: 500, height: 500 },
          { index: 1, x: 900, y: 60, width: 500, height: 500 },
        ],
      },
      null,
      2,
    );

    const res = validateLayoutJsonWithLines(jsonWithOverflow);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      const bgErr = res.errors.find((e) => e.path === "background_color");
      const slotErr = res.errors.find((e) => e.path === "slots[1].width");
      expect(bgErr?.line).toBe(4);
      expect(slotErr?.line).toBe(17);
    }
  });
});

describe("FR-06.2 upsertTemplateSchema & image upload metadata schema", () => {
  it("validates full template upsert payload", () => {
    const valid = upsertTemplateSchema.safeParse({
      name: "Classic White",
      category: "couple",
      preview_url: "https://res.cloudinary.com/demo/image/upload/preview.png",
      is_premium: false,
      is_active: true,
      layout_config: buildLayoutFromPreset("duo-2"),
    });
    expect(valid.success).toBe(true);

    const invalidCat = upsertTemplateSchema.safeParse({
      name: "Invalid Cat",
      category: "wedding",
      preview_url: "https://res.cloudinary.com/demo/image/upload/preview.png",
      layout_config: buildLayoutFromPreset("polaroid-1"),
    });
    expect(invalidCat.success).toBe(false);
  });

  it("enforces PNG/JPG/WEBP and <= 5 MB file limits for uploads", () => {
    expect(
      templateImageMetaSchema.safeParse({
        fileName: "frame.png",
        fileType: "image/png",
        fileSize: 5 * 1024 * 1024,
        kind: "frame",
      }).success,
    ).toBe(true);

    expect(
      templateImageMetaSchema.safeParse({
        fileName: "too-big.webp",
        fileType: "image/webp",
        fileSize: 5 * 1024 * 1024 + 1,
        kind: "preview",
      }).success,
    ).toBe(false);

    expect(
      templateImageMetaSchema.safeParse({
        fileName: "script.svg",
        fileType: "image/svg+xml",
        fileSize: 1024,
        kind: "preview",
      }).success,
    ).toBe(false);
  });
});

describe("FR-06.2 Cloudinary signed upload & image validation helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("validates image mime type, size <= 5 MB, and binary magic headers", () => {
    expect(
      validateTemplateImageMeta({
        type: "image/png",
        size: MAX_TEMPLATE_IMAGE_BYTES,
      }),
    ).toEqual({ ok: true, mimeType: "image/png" });

    expect(
      validateTemplateImageMeta({
        type: "image/png",
        size: MAX_TEMPLATE_IMAGE_BYTES + 1,
      }).ok,
    ).toBe(false);

    expect(
      validateTemplateImageMeta({
        type: "image/gif",
        size: 1024,
      }).ok,
    ).toBe(false);

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const jpgBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const spoofedHtml = new TextEncoder().encode("<html><script>alert(1)</script></html>");

    expect(validateTemplateImageMagicBytes(pngBytes, "image/png")).toBe(true);
    expect(validateTemplateImageMagicBytes(jpgBytes, "image/jpeg")).toBe(true);
    expect(validateTemplateImageMagicBytes(webpBytes, "image/webp")).toBe(true);
    expect(validateTemplateImageMagicBytes(spoofedHtml, "image/png")).toBe(false);
  });

  it("signs Cloudinary upload parameters into folder pause/templates without returning the secret", () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    expect(hasCloudinaryConfig()).toBe(false);

    vi.stubGlobal("window", undefined);

    process.env.CLOUDINARY_CLOUD_NAME = "pause-demo";
    process.env.CLOUDINARY_API_KEY = "key-123";
    process.env.CLOUDINARY_API_SECRET = "super-secret-value";
    expect(hasCloudinaryConfig()).toBe(true);

    const payload = signCloudinaryUploadParams({ timestamp: 1700000000 });
    const expectedSig = createHash("sha1")
      .update(`folder=${CLOUDINARY_TEMPLATES_FOLDER}&timestamp=1700000000super-secret-value`)
      .digest("hex");

    expect(payload.folder).toBe("pause/templates");
    expect(payload.apiKey).toBe("key-123");
    expect(payload.signature).toBe(expectedSig);
    expect(payload.signature).toBe(
      buildCloudinarySignature(
        { timestamp: 1700000000, folder: "pause/templates" },
        "super-secret-value",
      ),
    );
    expect(JSON.stringify(payload)).not.toContain("super-secret-value");
  });
});

describe("FR-06.2 normalizeLayoutConfig & visual preview components", () => {
  it("normalizes shorthand hex colors and empty legacy layouts safely", () => {
    const normalized = normalizeLayoutConfig(
      {
        width: 1200,
        height: 1800,
        background_color: "#fff",
        slots: [],
        texts: [{ content: "Pause", x: 600, y: 1700, font_size: 40, color: "#333" }],
      },
      2,
    );

    expect(normalized.background_color).toBe("#FFFFFF");
    expect(normalized.slots).toHaveLength(2);
    expect(normalized.texts[0].color).toBe("#333333");
    expect(layoutConfigSchema.safeParse(normalized).success).toBe(true);
  });

  it("renders VisualLayoutEditor presets and MobileTemplatePreview crop-fill SVG", () => {
    const layout = buildLayoutFromPreset("grid-2x2");
    render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(VisualLayoutEditor, {
          value: layout,
          onChange: () => undefined,
          templateName: "Vintage Grid",
        }),
      ),
    );

    expect(screen.getByText("Dải 4 ảnh dọc")).toBeInTheDocument();
    expect(screen.getByText("Lưới 2×2")).toBeInTheDocument();
    expect(screen.getByText("Polaroid 1 ảnh")).toBeInTheDocument();
    expect(screen.getByText("Khung đôi 2 ảnh")).toBeInTheDocument();
    expect(screen.getByText("slot_count = 4")).toBeInTheDocument();

    render(
      React.createElement(MobileTemplatePreview, {
        layout,
        templateName: "Vintage Grid",
      }),
    );
    expect(screen.getByRole("img", { name: /Xem thử trên Mobile/i })).toBeInTheDocument();
  });
});
