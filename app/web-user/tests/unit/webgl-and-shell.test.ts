import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotFoundPage from "@/app/not-found";
import GlobalErrorPage from "@/app/error";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { PrintPreviewFallback2D } from "@/components/three/PrintPreviewFallback2D";
import { FALLBACK_TEMPLATES } from "@/lib/catalog-data";
import { isWebGLAvailable } from "@/lib/webgl-support";

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

describe("isWebGLAvailable", () => {
  it("returns false when canvas cannot create a WebGL context", () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);

    expect(isWebGLAvailable()).toBe(false);
    expect(getContextSpy).toHaveBeenCalled();
  });

  it("returns true and releases probe context when WebGL2 is available", () => {
    const loseContext = vi.fn();
    const fakeGl = {
      getExtension: vi.fn().mockReturnValue({ loseContext }),
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      (contextId: string) => (contextId === "webgl2" ? (fakeGl as never) : null)
    );

    expect(isWebGLAvailable()).toBe(true);
    expect(fakeGl.getExtension).toHaveBeenCalledWith("WEBGL_lose_context");
    expect(loseContext).toHaveBeenCalledTimes(1);
  });
});

describe("PrintPreviewFallback2D", () => {
  it("renders 2D fallback canvas with front/back toggle when WebGL is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(
      React.createElement(PrintPreviewFallback2D, {
        template: FALLBACK_TEMPLATES[0],
        slotPhotoUrls: {},
        caption: "Kỷ niệm Đà Lạt",
        coverType: "hard",
        paperType: "premium",
        reason: "unsupported",
      })
    );

    expect(screen.getByTestId("print-preview-fallback-2d")).toBeInTheDocument();
    expect(screen.getByText("Classic White")).toBeInTheDocument();
    expect(screen.getByText("Chế độ xem 2D (WebGL chưa bật)")).toBeInTheDocument();

    const canvas = screen.getByLabelText(/Mặt trước mẫu in Classic White/i);
    expect(canvas).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mặt sau" }));
    expect(
      screen.getByLabelText(/Mặt sau mẫu in Classic White kèm dấu ấn Pause/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Lật mặt in/i }));
    expect(
      screen.getByLabelText(/Mặt trước mẫu in Classic White/i)
    ).toBeInTheDocument();
  });
});

describe("App Router status pages and SEO routes", () => {
  it("renders branded 404 page with Home and Preview links", () => {
    render(React.createElement(NotFoundPage));

    expect(screen.getByText(/404 · Không tìm thấy trang/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Về trang chủ/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(
      screen.getByRole("link", { name: /Mở Preview mẫu in 3D/i })
    ).toHaveAttribute("href", "/preview");
  });

  it("renders branded error recovery page and invokes reset callback", () => {
    const reset = vi.fn();
    render(
      React.createElement(GlobalErrorPage, {
        error: new Error("Boom"),
        reset,
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /Thử tải lại/i }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /Về trang chủ/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("exposes robots and 3 public routes in sitemap", () => {
    const robotsConfig = robots();
    expect(robotsConfig.rules).toEqual({ userAgent: "*", allow: "/" });

    const entries = sitemap();
    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual([
      "/",
      "/preview",
      "/download",
    ]);
  });
});
