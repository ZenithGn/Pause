export const DEFAULT_ANDROID_APK_URL =
  "https://github.com/ZenithGn/Pause/releases/latest";

export const APP_RELEASE_VERSION = "v0.1.0";
export const APP_MIN_ANDROID = "Android 8.0+";

export interface AndroidApkMetadata {
  url: string;
  isFallbackRelease: boolean;
  isDirectApk: boolean;
  isBetaRelease: boolean;
  versionLabel: string;
}

/**
 * Resolves the public Android APK download URL from environment input.
 * Falls back to the official GitHub Releases page when empty or invalid.
 */
export function resolveAndroidApkUrl(rawUrl?: string | null): string {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    return DEFAULT_ANDROID_APK_URL;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Fall back to official GitHub releases URL on malformed values.
  }

  return DEFAULT_ANDROID_APK_URL;
}

/**
 * Builds structured metadata for the Download hero CTA and beta indicators.
 */
export function getAndroidApkMetadata(
  rawUrl?: string | null,
): AndroidApkMetadata {
  const url = resolveAndroidApkUrl(rawUrl);
  const isFallbackRelease = url === DEFAULT_ANDROID_APK_URL;
  const isDirectApk = /\.apk($|\?)/i.test(url);

  return {
    url,
    isFallbackRelease,
    isDirectApk,
    isBetaRelease: true,
    versionLabel: `${APP_RELEASE_VERSION} · ${APP_MIN_ANDROID}`,
  };
}
