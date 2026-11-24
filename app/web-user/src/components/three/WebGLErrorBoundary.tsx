"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches WebGL / Three.js runtime errors gracefully and renders a clean editorial fallback.
 */
export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Fallback UI handles degraded WebGL environments without breaking the page.
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="region"
          aria-label="Minh họa xem trước"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "0.75rem",
            padding: "2rem",
            minHeight: "260px",
            borderRadius: "16px",
            border: "1px solid var(--color-line, #E5E2DF)",
            background: "linear-gradient(145deg, #FAF7F2 0%, #F3EFE8 100%)",
            color: "var(--color-ink, #111111)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              backgroundColor: "#630D11",
              border: "1px solid #C59B38",
              color: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display-family, system-ui, sans-serif)",
              fontWeight: 700,
              fontSize: "1.5rem",
            }}
          >
            P
          </span>
          <p
            style={{
              fontFamily: "var(--font-display-family, system-ui, sans-serif)",
              fontWeight: 700,
              fontSize: "1.125rem",
            }}
          >
            {this.props.title ?? "Không gian 3D đang tạm nghỉ"}
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-ink-muted, #595552)",
              maxWidth: "340px",
            }}
          >
            {this.props.description ??
              "Trình duyệt hiện tại chưa bật tăng tốc phần cứng WebGL. Bạn vẫn có thể xem thông tin và sử dụng đầy đủ tính năng của Pause."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
