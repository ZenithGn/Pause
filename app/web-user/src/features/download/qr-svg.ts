import QRCode from "qrcode";

export interface QrSvgData {
  size: number;
  quietZone: number;
  totalSize: number;
  pathData: string;
  moduleCount: number;
}

/**
 * Converts a string into a deterministic QR matrix and a compact SVG path.
 * Uses error correction level M and emits 1x1 path subpaths for safe inline
 * React <svg><path /></svg> rendering without raw HTML injection.
 */
export function buildQrSvgData(value: string, quietZone = 2): QrSvgData {
  const normalizedValue = value.trim() || "https://github.com/ZenithGn/Pause/releases/latest";
  const safeQuietZone = Math.max(0, Math.floor(quietZone));
  const qr = QRCode.create(normalizedValue, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;

  const segments: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (qr.modules.get(row, col)) {
        const x = col + safeQuietZone;
        const y = row + safeQuietZone;
        segments.push(`M${x} ${y}h1v1h-1z`);
      }
    }
  }

  return {
    size,
    quietZone: safeQuietZone,
    totalSize: size + safeQuietZone * 2,
    pathData: segments.join(""),
    moduleCount: segments.length,
  };
}
