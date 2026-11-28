import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroPhotoboothStage } from "@/components/three/HeroPhotoboothStage";
import {
  computeHeroCardPose,
  getHeroTemplateCaption,
  getHeroTemplateSamplePhotos,
  selectHeroShowcaseTemplates,
} from "@/features/home/hero-showcase";
import { DownloadCtaSection } from "@/features/home/DownloadCtaSection";
import { HeroSection } from "@/features/home/HeroSection";
import { ProcessInteractiveSteps } from "@/features/home/ProcessInteractiveSteps";
import { FALLBACK_TEMPLATES, SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import { computePrintCardDimensions, isDarkHex } from "@/lib/print-card-3d";

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockHeroPhotoboothStage(props: { templates: { id: string }[] }) {
      return React.createElement("div", {
        "data-testid": "mock-hero-photobooth-stage",
        "data-template-count": String(props.templates.length),
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

describe("hero-showcase helpers", () => {
  it("selects 3 diverse templates (portrait strip, Polaroid square, VIP gold)", () => {
    const selected = selectHeroShowcaseTemplates(FALLBACK_TEMPLATES);
    expect(selected).toHaveLength(3);
    expect(selected.map((t) => t.id)).toEqual([
      "tpl-classic-white",
      "tpl-family-portrait",
      "tpl-premium-gold",
    ]);
  });

  it("maps deterministic sample photos and curated captions for each Hero template", () => {
    const classic = FALLBACK_TEMPLATES[0];
    const photos = getHeroTemplateSamplePhotos(classic, 1);

    expect(photos).toEqual({
      0: SAMPLE_PHOTO_URLS[1],
      1: SAMPLE_PHOTO_URLS[2],
    });
    expect(getHeroTemplateCaption(classic)).toBe("Đà Lạt · 2026");
  });

  it("computes front, right, and left fan poses cleanly including 180deg flip", () => {
    const front = computeHeroCardPose(0, 0, 3, false, false);
    const right = computeHeroCardPose(1, 0, 3, false, false);
    const left = computeHeroCardPose(2, 0, 3, false, false);
    const flippedFront = computeHeroCardPose(0, 0, 3, true, true);

    expect(front.role).toBe("front");
    expect(front.position[2]).toBeGreaterThan(0.3);
    expect(front.scale).toBe(1);

    expect(right.role).toBe("right");
    expect(right.position[0]).toBeGreaterThan(0.8);

    expect(left.role).toBe("left");
    expect(left.position[0]).toBeLessThan(-0.8);

    expect(flippedFront.rotation[1]).toBeCloseTo(Math.PI, 4);
    expect(flippedFront.scale).toBeGreaterThan(1);
  });
});

describe("print-card-3d geometry helpers", () => {
  it("detects dark hex colors and computes clamped dimensions for portrait vs square templates", () => {
    expect(isDarkHex("#111111")).toBe(true);
    expect(isDarkHex("#FFFFFF")).toBe(false);

    const classic = FALLBACK_TEMPLATES[0]; // 1200x1800
    const polaroid = FALLBACK_TEMPLATES[4]; // 1200x1200
    const vip = FALLBACK_TEMPLATES[5]; // 1200x1800 dark + premium

    const classicDims = computePrintCardDimensions(classic, "soft", 2.35, 1.85);
    expect(classicDims.cardHeight).toBeCloseTo(2.35, 3);
    expect(classicDims.cardWidth).toBeLessThan(1.85);
    expect(classicDims.isGoldEdge).toBe(false);

    const squareDims = computePrintCardDimensions(polaroid, "hard", 2.35, 1.85);
    expect(squareDims.cardWidth).toBeCloseTo(1.85, 3);
    expect(squareDims.cardHeight).toBeCloseTo(1.85, 3);
    expect(squareDims.cardDepth).toBeGreaterThan(classicDims.cardDepth);

    const vipDims = computePrintCardDimensions(vip, "hard", 2.35, 1.85);
    expect(vipDims.isGoldEdge).toBe(true);
  });
});

describe("Home Hero and Final CTA layout without sticky overlay", () => {
  it("renders Hero 3D Photobooth stage directly in HeroSection without data-camera-zone", () => {
    const { container } = render(
      React.createElement(HeroSection, { templates: FALLBACK_TEMPLATES })
    );

    expect(container.querySelector("[data-camera-zone]")).toBeNull();
    expect(screen.getByTestId("mock-hero-photobooth-stage")).toHaveAttribute(
      "data-template-count",
      "6"
    );
  });

  it("renders a real keepsake showcase in DownloadCtaSection instead of an empty spacer", () => {
    const { container } = render(React.createElement(DownloadCtaSection));

    expect(container.querySelector("[data-camera-zone]")).toBeNull();
    expect(
      screen.getByText(/Trọn vẹn từ màn hình đến tay bạn/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/PAUSE GOLD · 200GSM/i)).toBeInTheDocument();
  });

  it("renders pure frameless 3D photobooth stage without overlay hints or control buttons", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(
      React.createElement(HeroPhotoboothStage, {
        templates: FALLBACK_TEMPLATES,
      })
    );

    expect(screen.getByTestId("hero-photobooth-stage")).toBeInTheDocument();
    expect(screen.queryByText(/Rê chuột soi sáng/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /Thử ảnh của bạn/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Lật mặt sau/i })).toBeNull();

    // Direct click on cards still works in 2D fallback
    fireEvent.click(screen.getByRole("button", { name: /Chọn mẫu Premium Gold/i }));
    expect(screen.getByRole("button", { name: /Chọn mẫu Premium Gold/i })).toBeInTheDocument();
  });

  it("renders the compact 3-step Photobooth workflow strip cleanly", () => {
    render(React.createElement(ProcessInteractiveSteps));

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Chọn mẫu Photobooth")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("Ghép ảnh & chỉnh màu")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText(/Giấy satin 200gsm/i)).toBeInTheDocument();
  });
});
