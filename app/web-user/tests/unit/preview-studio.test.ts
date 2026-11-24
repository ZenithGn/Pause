import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_TEMPLATES, SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import {
  assignEntriesToSlots,
  clearAllSlotEntries,
  fillSampleSlotEntries,
  filterTemplates,
  getActiveSlotPhotoUrls,
  removeSlotEntry,
  replaceSlotEntry,
  resolveInitialTemplateId,
  swapSlotEntries,
  type SlotPhotoMap,
} from "@/features/preview/preview-state";
import { PreviewStudio } from "@/features/preview/PreviewStudio";

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockPrintPreviewScene3D(props: {
      template: { name: string };
      slotPhotoUrls: Record<number, string>;
      caption: string;
      coverType: string;
      paperType: string;
    }) {
      return React.createElement("div", {
        "data-testid": "mock-print-scene-3d",
        "data-template": props.template.name,
        "data-cover": props.coverType,
        "data-paper": props.paperType,
        "data-caption": props.caption,
        "data-slot-count": String(Object.keys(props.slotPhotoUrls).length),
      });
    };
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...rest }, children),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("preview-state helpers", () => {
  it("filters templates by category and VIP status", () => {
    expect(filterTemplates(FALLBACK_TEMPLATES, "all")).toHaveLength(6);
    expect(filterTemplates(FALLBACK_TEMPLATES, "couple").map((t) => t.id)).toEqual([
      "tpl-classic-white",
      "tpl-premium-gold",
    ]);
    expect(filterTemplates(FALLBACK_TEMPLATES, "friends").map((t) => t.id)).toEqual([
      "tpl-vintage-memories",
      "tpl-pastel-grid",
    ]);
    expect(filterTemplates(FALLBACK_TEMPLATES, "family").map((t) => t.id)).toEqual([
      "tpl-family-portrait",
    ]);
    expect(filterTemplates(FALLBACK_TEMPLATES, "general").map((t) => t.id)).toEqual([
      "tpl-minimal-strip",
    ]);
    expect(filterTemplates(FALLBACK_TEMPLATES, "vip").map((t) => t.id)).toEqual([
      "tpl-premium-gold",
    ]);
  });

  it("resolves initial template from query param or falls back to first template", () => {
    expect(resolveInitialTemplateId(FALLBACK_TEMPLATES, "tpl-premium-gold")).toBe(
      "tpl-premium-gold"
    );
    expect(resolveInitialTemplateId(FALLBACK_TEMPLATES, "missing-id")).toBe(
      "tpl-classic-white"
    );
    expect(resolveInitialTemplateId(FALLBACK_TEMPLATES, undefined)).toBe(
      "tpl-classic-white"
    );
  });

  it("preserves already-picked slot photos across template switches", () => {
    const initialMap: SlotPhotoMap = {
      0: { url: "blob:photo-0", name: "a.jpg", isObjectUrl: true },
      1: { url: "blob:photo-1", name: "b.jpg", isObjectUrl: true },
      2: { url: "blob:photo-2", name: "c.jpg", isObjectUrl: true },
      3: { url: "blob:photo-3", name: "d.jpg", isObjectUrl: true },
    };

    // Switch to a 2-slot template: exposes slots 0..1 while underlying map keeps 0..3
    expect(getActiveSlotPhotoUrls(initialMap, 2)).toEqual({
      0: "blob:photo-0",
      1: "blob:photo-1",
    });

    // Switch back to a 4-slot template: all 4 photos remain intact
    expect(getActiveSlotPhotoUrls(initialMap, 4)).toEqual({
      0: "blob:photo-0",
      1: "blob:photo-1",
      2: "blob:photo-2",
      3: "blob:photo-3",
    });
  });

  it("assigns multi-file entries sequentially into empty slots and tracks revoked URLs", () => {
    const current: SlotPhotoMap = {
      1: { url: "blob:existing-1", name: "keep.jpg", isObjectUrl: true },
    };
    const { nextMap, urlsToRevoke } = assignEntriesToSlots(
      current,
      [
        { url: "blob:new-0", name: "new0.jpg", isObjectUrl: true },
        { url: "blob:new-2", name: "new2.jpg", isObjectUrl: true },
        { url: "blob:new-1", name: "new1.jpg", isObjectUrl: true },
      ],
      3
    );

    expect(nextMap[0]?.url).toBe("blob:new-0");
    expect(nextMap[2]?.url).toBe("blob:new-2");
    expect(nextMap[1]?.url).toBe("blob:new-1");
    expect(urlsToRevoke).toEqual(["blob:existing-1"]);
  });

  it("replaces, swaps, removes, fills samples, and clears slot entries cleanly", () => {
    const base: SlotPhotoMap = {
      0: { url: "blob:0", name: "0.jpg", isObjectUrl: true },
      1: { url: "blob:1", name: "1.jpg", isObjectUrl: true },
    };

    const replaced = replaceSlotEntry(base, 0, {
      url: "blob:0b",
      name: "0b.jpg",
      isObjectUrl: true,
    });
    expect(replaced.urlToRevoke).toBe("blob:0");
    expect(replaced.nextMap[0]?.url).toBe("blob:0b");

    const swapped = swapSlotEntries(replaced.nextMap, 0, 1);
    expect(swapped[0]?.url).toBe("blob:1");
    expect(swapped[1]?.url).toBe("blob:0b");

    const removed = removeSlotEntry(swapped, 0);
    expect(removed.urlToRevoke).toBe("blob:1");
    expect(removed.nextMap[0]).toBeUndefined();
    expect(removed.nextMap[1]?.url).toBe("blob:0b");

    const sampled = fillSampleSlotEntries(removed.nextMap, SAMPLE_PHOTO_URLS, 4);
    expect(sampled.urlsToRevoke).toEqual(["blob:0b"]);
    expect(Object.keys(sampled.nextMap)).toHaveLength(4);
    expect(sampled.nextMap[0]?.url).toBe(SAMPLE_PHOTO_URLS[0]);
    expect(sampled.nextMap[3]?.url).toBe(SAMPLE_PHOTO_URLS[3]);

    const cleared = clearAllSlotEntries(swapped);
    expect(cleared.nextMap).toEqual({});
    expect(cleared.urlsToRevoke).toEqual(["blob:1", "blob:0b"]);
  });
});

describe("PreviewStudio component", () => {
  it("preserves picked photos when switching templates and never renders a PNG export button", () => {
    render(
      React.createElement(PreviewStudio, {
        templates: FALLBACK_TEMPLATES,
        initialTemplateId: "tpl-classic-white",
      })
    );

    const stage = screen.getByTestId("mock-print-scene-3d");
    expect(stage).toHaveAttribute("data-template", "Classic White");

    // Step 2: Fill sample photos and enter a caption
    fireEvent.click(screen.getByRole("tab", { name: /2\. Chọn ảnh/i }));

    expect(
      screen.getByText(
        "Ảnh chỉ hiển thị trực tiếp trên trình duyệt của bạn, không tải lên máy chủ."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Điền ảnh mẫu nhanh/i }));
    expect(stage).toHaveAttribute("data-slot-count", "2");

    const captionInput = screen.getByLabelText("Lời nhắn / Chú thích in trên khung");
    fireEvent.change(captionInput, { target: { value: "Đà Lạt 2026" } });
    expect(stage).toHaveAttribute("data-caption", "Đà Lạt 2026");

    // Step 1: Filter VIP and switch to Premium Gold (4 slots) -> slots 0 & 1 are preserved
    fireEvent.click(screen.getByRole("tab", { name: /1\. Chọn mẫu in/i }));
    fireEvent.click(screen.getByRole("button", { name: /Mẫu VIP/i }));
    fireEvent.click(screen.getByRole("button", { name: /Premium Gold/i }));

    expect(stage).toHaveAttribute("data-template", "Premium Gold");
    expect(stage).toHaveAttribute("data-slot-count", "2");

    // Step 3: Material controls, VIP notice, estimated price, and /download CTA
    fireEvent.click(screen.getByRole("tab", { name: /3\. Chất liệu/i }));

    fireEvent.click(screen.getByRole("button", { name: /Bìa cứng cao cấp/i }));
    fireEvent.click(screen.getByRole("button", { name: /Giấy mỹ thuật 200gsm/i }));
    expect(stage).toHaveAttribute("data-cover", "hard");
    expect(stage).toHaveAttribute("data-paper", "premium");

    expect(screen.getByRole("note")).toHaveTextContent("PAUSE Go");
    expect(screen.getByText("54.000đ")).toBeInTheDocument();

    const downloadCta = screen.getByRole("link", {
      name: /Tải App Pause để lưu Ngăn kéo & đặt in/i,
    });
    expect(downloadCta).toHaveAttribute("href", "/download");

    // Policy check: NO PNG download or export button anywhere in the studio
    const panel = screen.getByRole("complementary", {
      name: "Bảng tùy chỉnh mẫu in",
    });
    const allButtons = within(panel).getAllByRole("button");
    for (const btn of allButtons) {
      expect(btn.textContent ?? "").not.toMatch(/png|xuất ảnh|tải ảnh xem thử/i);
    }
  });
});
