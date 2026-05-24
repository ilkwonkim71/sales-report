import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "영업 보고서",
  description: "일일 영업 보고서 관리 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
