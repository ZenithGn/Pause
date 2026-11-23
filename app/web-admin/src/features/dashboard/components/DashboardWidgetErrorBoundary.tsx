"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorState } from "@/components/ui";

interface ErrorBoundaryInnerProps {
  title: string;
  onRetry: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryInnerState {
  hasError: boolean;
}

class ErrorBoundaryInner extends React.Component<
  ErrorBoundaryInnerProps,
  ErrorBoundaryInnerState
> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryInnerState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("[DashboardWidgetErrorBoundary]", error);
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Card>
          <ErrorState
            title={this.props.title}
            message="Widget gặp sự cố khi hiển thị. Các khu vực khác của Dashboard vẫn hoạt động bình thường."
            onRetry={() => {
              this.setState({ hasError: false });
              this.props.onRetry();
            }}
          />
        </Card>
      );
    }
    return this.props.children;
  }
}

export interface DashboardWidgetErrorBoundaryProps {
  title?: string;
  children: React.ReactNode;
}

export function DashboardWidgetErrorBoundary({
  title = "Không thể hiển thị widget",
  children,
}: DashboardWidgetErrorBoundaryProps) {
  const router = useRouter();

  return (
    <ErrorBoundaryInner title={title} onRetry={() => router.refresh()}>
      {children}
    </ErrorBoundaryInner>
  );
}
