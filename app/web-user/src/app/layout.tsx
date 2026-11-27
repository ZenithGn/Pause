import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono, Playfair_Display } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import "@/styles/globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pause — Dừng lại, lưu giữ, hiện thực hóa kỷ niệm",
    template: "%s | Pause",
  },
  description:
    "Lưu trữ ảnh theo từng Ngăn kéo Kỷ niệm, xem thử mẫu in Photobooth 3D trực tiếp trên trình duyệt và đặt in giao tận nhà.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`${playfairDisplay.variable} ${beVietnamPro.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
