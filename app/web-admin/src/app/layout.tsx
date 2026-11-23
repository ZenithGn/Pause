import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pause Admin | Quản trị hệ thống",
    template: "%s | Pause Admin",
  },
  description:
    "Cổng quản trị hệ thống Pause – quản lý người dùng, template photobooth, đơn hàng in ấn và gói hội viên.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
