"use client";

import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import styles from "./SafeOrderImage.module.css";

export interface SafeOrderImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export function SafeOrderImage({
  src,
  alt,
  className = "",
  fallbackText = "Không tải được ảnh",
}: SafeOrderImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`${styles.placeholder} ${className}`} role="img" aria-label={alt}>
        <ImageOff size={18} aria-hidden="true" />
        <span>{fallbackText}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
