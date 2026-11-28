"use client";

import React, { useState } from "react";
import { ImageIcon } from "lucide-react";

export interface TemplatePreviewThumbProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function TemplatePreviewThumb({
  src,
  alt,
  className = "",
  fallbackClassName = "",
}: TemplatePreviewThumbProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={fallbackClassName} aria-hidden="true">
        <ImageIcon size={18} />
      </span>
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
