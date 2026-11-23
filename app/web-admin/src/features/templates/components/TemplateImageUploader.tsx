"use client";

import React, { useId, useRef, useState } from "react";
import { Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { Button, TextField, useToast } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  requestTemplateImageUploadAction,
  uploadTemplateImageAction,
} from "../actions";
import styles from "./TemplateImageUploader.module.css";

const MAX_BYTES = 5 * 1024 * 1024;
const SERVER_ACTION_SAFE_BYTES = 850 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export interface TemplateImageUploaderProps {
  label: string;
  value: string;
  onChange: (nextUrl: string) => void;
  kind: "preview" | "frame";
  required?: boolean;
  nullable?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
}

function getExtensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function TemplateImageUploader({
  label,
  value,
  onChange,
  kind,
  required = false,
  nullable = false,
  error,
  helperText,
  placeholder = "https://res.cloudinary.com/...",
}: TemplateImageUploaderProps) {
  const toast = useToast();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  const displayedError = error ?? localError ?? undefined;

  const uploadFile = async (file: File) => {
    setLocalError(null);
    setPreviewBroken(false);

    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      const msg = "Chỉ hỗ trợ ảnh định dạng PNG, JPG hoặc WEBP.";
      setLocalError(msg);
      toast.error("Định dạng không hợp lệ", msg);
      return;
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      const msg = "Dung lượng tệp phải nhỏ hơn hoặc bằng 5 MB.";
      setLocalError(msg);
      toast.error("Tệp quá lớn", msg);
      return;
    }

    setIsUploading(true);
    try {
      const strategyRes = await requestTemplateImageUploadAction({
        fileName: file.name,
        fileType: file.type.toLowerCase() as "image/png" | "image/jpeg" | "image/webp",
        fileSize: file.size,
        kind,
      });

      if (!strategyRes.ok) {
        setLocalError(strategyRes.message);
        toast.error("Không thể tải ảnh", strategyRes.message);
        return;
      }

      const strategy = strategyRes.data;

      if (strategy.mode === "cloudinary") {
        const cloudBody = new FormData();
        cloudBody.append("file", file);
        cloudBody.append("api_key", strategy.apiKey);
        cloudBody.append("timestamp", String(strategy.timestamp));
        cloudBody.append("folder", strategy.folder);
        cloudBody.append("signature", strategy.signature);

        const response = await fetch(strategy.uploadUrl, {
          method: "POST",
          body: cloudBody,
        });

        if (!response.ok) {
          throw new Error("Tải ảnh lên Cloudinary thất bại.");
        }

        const payload = (await response.json()) as { secure_url?: string };
        if (!payload.secure_url) {
          throw new Error("Cloudinary không trả về đường dẫn secure_url.");
        }

        onChange(payload.secure_url);
        toast.success("Tải ảnh thành công", "Ảnh đã được lưu trên Cloudinary.");
        return;
      }

      if (strategy.mode === "supabase" && file.size > SERVER_ACTION_SAFE_BYTES) {
        const supabase = createSupabaseBrowserClient();
        const ext = getExtensionFromMime(file.type.toLowerCase());
        const folder = kind === "frame" ? "frames" : "previews";
        const uniqueId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const objectPath = `${folder}/${uniqueId}.${ext}`;

        const { error: storageError } = await supabase.storage
          .from("templates")
          .upload(objectPath, file, {
            contentType: file.type,
            upsert: false,
            cacheControl: "3600",
          });

        if (storageError) {
          throw new Error(storageError.message);
        }

        const { data: urlData } = supabase.storage
          .from("templates")
          .getPublicUrl(objectPath);

        if (!urlData?.publicUrl) {
          throw new Error("Không thể lấy URL công khai từ Supabase Storage.");
        }

        onChange(urlData.publicUrl);
        toast.success("Tải ảnh thành công", "Ảnh đã được lưu trên Supabase Storage.");
        return;
      }

      const serverBody = new FormData();
      serverBody.append("file", file);
      serverBody.append("kind", kind);

      const uploadRes = await uploadTemplateImageAction(serverBody);
      if (!uploadRes.ok) {
        setLocalError(uploadRes.message);
        toast.error("Tải ảnh thất bại", uploadRes.message);
        return;
      }

      onChange(uploadRes.data.url);
      toast.success("Tải ảnh thành công", uploadRes.message);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể tải ảnh lên. Bạn có thể dán trực tiếp URL ảnh bên dưới.";
      setLocalError(msg);
      toast.error("Tải ảnh thất bại", msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      void uploadFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void uploadFile(file);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <label htmlFor={inputId} className={styles.label}>
          <span>{label}</span>
          {required ? (
            <span className={styles.requiredMark} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {nullable && value ? (
          <Button
            variant="text"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={() => {
              setPreviewBroken(false);
              setLocalError(null);
              onChange("");
            }}
          >
            Gỡ ảnh khung
          </Button>
        ) : null}
      </div>

      <div
        className={[
          styles.dropzone,
          isDragging ? styles.dropzoneActive : "",
          displayedError ? styles.dropzoneError : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className={styles.previewBox}>
          {value && !previewBroken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={label}
              className={styles.previewImg}
              onError={() => setPreviewBroken(true)}
            />
          ) : (
            <ImageIcon size={24} aria-hidden="true" />
          )}
        </div>

        <div className={styles.dropzoneBody}>
          <p className={styles.hint}>
            Kéo thả ảnh PNG, JPG, WEBP (tối đa 5 MB) hoặc dán URL trực tiếp bên dưới.
          </p>
          <div className={styles.actions}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.hiddenInput}
              onChange={handleFileChange}
              aria-label={`Tải lên ${label}`}
            />
            <Button
              variant="tonal"
              size="sm"
              loading={isUploading}
              leftIcon={<UploadCloud size={15} />}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "Đang tải lên..." : "Chọn tệp ảnh"}
            </Button>
          </div>
        </div>
      </div>

      <TextField
        id={inputId}
        value={value}
        onChange={(event) => {
          setPreviewBroken(false);
          setLocalError(null);
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        error={displayedError}
        helperText={helperText}
      />
    </div>
  );
}
