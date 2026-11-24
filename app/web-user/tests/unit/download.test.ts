import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  DEFAULT_ANDROID_APK_URL,
  getAndroidApkMetadata,
  resolveAndroidApkUrl,
} from "@/features/download/apk-config";
import { buildQrSvgData } from "@/features/download/qr-svg";
import { QrCodeCard } from "@/features/download/QrCodeCard";
import {
  DOWNLOAD_FAQ_ITEMS,
  DownloadFaq,
} from "@/features/download/DownloadFaq";
import { DownloadActions } from "@/features/download/DownloadActions";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Android APK URL fallback resolution", () => {
  it("falls back to official GitHub releases URL when env is empty or invalid", () => {
    expect(resolveAndroidApkUrl(undefined)).toBe(DEFAULT_ANDROID_APK_URL);
    expect(resolveAndroidApkUrl(null)).toBe(DEFAULT_ANDROID_APK_URL);
    expect(resolveAndroidApkUrl("")).toBe(DEFAULT_ANDROID_APK_URL);
    expect(resolveAndroidApkUrl("   ")).toBe(DEFAULT_ANDROID_APK_URL);
    expect(resolveAndroidApkUrl("javascript:alert(1)")).toBe(
      DEFAULT_ANDROID_APK_URL,
    );
    expect(resolveAndroidApkUrl("not-a-valid-url")).toBe(
      DEFAULT_ANDROID_APK_URL,
    );
  });

  it("preserves valid HTTPS APK URLs and detects direct .apk assets", () => {
    const directUrl =
      "https://github.com/ZenithGn/Pause/releases/download/v0.1.0/pause-v0.1.0.apk";
    expect(resolveAndroidApkUrl(`  ${directUrl}  `)).toBe(directUrl);

    const directMeta = getAndroidApkMetadata(directUrl);
    expect(directMeta).toEqual({
      url: directUrl,
      isFallbackRelease: false,
      isDirectApk: true,
      isBetaRelease: true,
      versionLabel: "v0.1.0 · Android 8.0+",
    });

    const fallbackMeta = getAndroidApkMetadata(undefined);
    expect(fallbackMeta).toEqual({
      url: DEFAULT_ANDROID_APK_URL,
      isFallbackRelease: true,
      isDirectApk: false,
      isBetaRelease: true,
      versionLabel: "v0.1.0 · Android 8.0+",
    });
  });
});

describe("QR matrix SVG path generation", () => {
  it("builds a deterministic SVG path and dimensions from QRCode.create", () => {
    const first = buildQrSvgData(DEFAULT_ANDROID_APK_URL, 2);
    const second = buildQrSvgData(DEFAULT_ANDROID_APK_URL, 2);

    expect(first).toEqual(second);
    expect(first.size).toBeGreaterThan(20);
    expect(first.quietZone).toBe(2);
    expect(first.totalSize).toBe(first.size + 4);
    expect(first.moduleCount).toBeGreaterThan(100);
    expect(first.pathData.startsWith("M")).toBe(true);
    expect(first.pathData).toContain("h1v1h-1z");
  });

  it("renders a clean inline SVG QR element without raw HTML injection", () => {
    const { container } = render(
      createElement(QrCodeCard, { apkUrl: DEFAULT_ANDROID_APK_URL }),
    );

    const qrImg = screen.getByRole("img", {
      name: new RegExp(DEFAULT_ANDROID_APK_URL),
    });
    expect(qrImg.tagName.toLowerCase()).toBe("svg");

    const path = qrImg.querySelector("path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("fill")).toBe("#630D11");
    expect(path?.getAttribute("d")?.length).toBeGreaterThan(50);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});

describe("DownloadFaq accordion interaction", () => {
  it("renders 4 items collapsed by default and toggles expand/collapse cleanly", () => {
    render(createElement(DownloadFaq));

    expect(DOWNLOAD_FAQ_ITEMS).toHaveLength(4);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);

    for (const btn of buttons) {
      expect(btn).toHaveAttribute("aria-expanded", "false");
    }

    const firstBtn = screen.getByRole("button", {
      name: /an toàn và riêng tư/i,
    });
    const firstPanelId = firstBtn.getAttribute("aria-controls");
    expect(firstPanelId).toBeTruthy();
    const firstPanel = document.getElementById(firstPanelId!);
    expect(firstPanel).not.toBeNull();
    expect(firstPanel).toHaveAttribute("hidden");

    // Expand first item
    fireEvent.click(firstBtn);
    expect(firstBtn).toHaveAttribute("aria-expanded", "true");
    expect(firstPanel).not.toHaveAttribute("hidden");
    expect(firstPanel).toBeVisible();

    // Expand second item collapses first item
    const secondBtn = screen.getByRole("button", {
      name: /Gói Miễn phí/i,
    });
    const secondPanel = document.getElementById(
      secondBtn.getAttribute("aria-controls")!,
    );
    fireEvent.click(secondBtn);
    expect(secondBtn).toHaveAttribute("aria-expanded", "true");
    expect(secondPanel).toBeVisible();
    expect(firstBtn).toHaveAttribute("aria-expanded", "false");
    expect(firstPanel).toHaveAttribute("hidden");

    // Collapse second item by clicking again
    fireEvent.click(secondBtn);
    expect(secondBtn).toHaveAttribute("aria-expanded", "false");
    expect(secondPanel).toHaveAttribute("hidden");
  });
});

describe("DownloadActions CTA and copyable link feedback", () => {
  it("renders primary APK link, platform coming soon metadata, and copies link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      createElement(DownloadActions, {
        apkUrl: DEFAULT_ANDROID_APK_URL,
        isDirectApk: false,
        isBetaRelease: true,
      }),
    );

    const apkLink = screen.getByRole("link", { name: /Tải file APK Android/i });
    expect(apkLink).toHaveAttribute("href", DEFAULT_ANDROID_APK_URL);

    expect(screen.getByText(/Google Play & iOS sắp ra mắt/i)).toBeVisible();

    const copyButton = screen.getByRole("button", {
      name: /Sao chép liên kết tải APK/i,
    });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith(DEFAULT_ANDROID_APK_URL);
    expect(screen.getByRole("status")).toHaveTextContent(/Đã sao chép/);
  });
});
