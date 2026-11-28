"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import styles from "./DownloadHero.module.css";

interface DownloadActionsProps {
  apkUrl: string;
  isDirectApk: boolean;
  isBetaRelease: boolean;
}

export function DownloadActions({
  apkUrl,
  isDirectApk,
  isBetaRelease,
}: DownloadActionsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!copied && !copyError) return;
    const timer = window.setTimeout(() => {
      setCopied(false);
      setCopyError(false);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [copied, copyError]);

  async function handleCopyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(apkUrl);
        setCopied(true);
        setCopyError(false);
        return;
      }
      setCopyError(true);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className={styles.actionsBlock}>
      <div className={styles.ctaRow}>
        <a
          href={apkUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={isDirectApk ? "Pause-Android.apk" : undefined}
          className={styles.primaryCta}
        >
          <Download size={18} aria-hidden="true" />
          <span>Tải file APK Android</span>
          <ExternalLink size={15} aria-hidden="true" className={styles.ctaExternalIcon} />
        </a>

        <button
          type="button"
          className={`${styles.secondaryCopyBtn} ${copied ? styles.copyBtnSuccess : ""}`}
          onClick={handleCopyLink}
          aria-label="Sao chép liên kết tải APK"
        >
          {copied ? (
            <>
              <Check size={16} aria-hidden="true" />
              <span>Đã sao chép link</span>
            </>
          ) : (
            <>
              <Copy size={16} aria-hidden="true" />
              <span>Sao chép link tải</span>
            </>
          )}
        </button>
      </div>

      <p className={styles.platformMeta}>
        {isBetaRelease
          ? "Bản thử nghiệm Beta, không quảng cáo · Google Play & iOS sắp ra mắt"
          : "Không quảng cáo · Google Play & iOS sắp ra mắt"}
      </p>

      {copied || copyError ? (
        <p className={styles.liveFeedback} role="status" aria-live="polite">
          {copied
            ? "Đã sao chép liên kết tải Pause Android vào bộ nhớ tạm."
            : "Không thể tự động sao chép, vui lòng bấm trực tiếp nút Tải file APK Android."}
        </p>
      ) : null}
    </div>
  );
}
