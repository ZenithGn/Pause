"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Smartphone } from "lucide-react";
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
          className={styles.secondaryPlayBtn}
          disabled
          aria-disabled="true"
          title="Ứng dụng đang trong giai đoạn phát hành APK Beta, sẽ sớm có mặt trên Google Play"
        >
          <Smartphone size={18} aria-hidden="true" />
          <span>Google Play</span>
          <span className={styles.comingSoonBadge}>Sắp ra mắt</span>
        </button>
      </div>

      <div className={styles.copyBox}>
        <div className={styles.copyMeta}>
          <span className={styles.copyLabel}>Liên kết tải chính thức</span>
          <code className={styles.copyUrl} title={apkUrl}>
            {apkUrl}
          </code>
        </div>
        <button
          type="button"
          className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ""}`}
          onClick={handleCopyLink}
          aria-label="Sao chép liên kết tải APK"
        >
          {copied ? (
            <>
              <Check size={15} aria-hidden="true" />
              <span>Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy size={15} aria-hidden="true" />
              <span>Sao chép link</span>
            </>
          )}
        </button>
      </div>

      <p className={styles.liveFeedback} role="status" aria-live="polite">
        {copied
          ? "Đã sao chép liên kết tải Pause Android vào bộ nhớ tạm."
          : copyError
            ? "Không thể tự động sao chép, vui lòng chọn trực tiếp đường dẫn ở trên."
            : ""}
      </p>

      {isBetaRelease ? (
        <div className={styles.betaNotice}>
          <span className={styles.betaDot} aria-hidden="true" />
          <p>
            <strong>Bản thử nghiệm Beta (v0.1.0):</strong> Phát hành trực tiếp
            qua GitHub Releases để bạn trải nghiệm sớm trước khi lên Google Play.
          </p>
        </div>
      ) : null}
    </div>
  );
}
