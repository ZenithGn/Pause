"use client";

import React, { useState } from "react";
import Image from "next/image";
import styles from "./UserAvatar.module.css";

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_PX: Record<"sm" | "md" | "lg", number> = {
  sm: 34,
  md: 44,
  lg: 64,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ND";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function isRenderableHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canRenderImage = isRenderableHttpUrl(avatarUrl) && failedUrl !== avatarUrl;
  const pixelSize = SIZE_PX[size];

  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${className}`}
      aria-hidden={!canRenderImage || undefined}
    >
      {canRenderImage ? (
        <Image
          src={avatarUrl}
          alt={`Ảnh đại diện của ${name}`}
          width={pixelSize}
          height={pixelSize}
          unoptimized
          className={styles.image}
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
