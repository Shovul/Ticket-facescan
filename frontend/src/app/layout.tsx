import "../styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <title>EventPass — Nền Tảng Sự Kiện &amp; Điểm Danh Face ID</title>
        <meta name="description" content="EventPass — Cổng phát hành vé điện tử & Điểm danh khuôn mặt Face ID siêu tốc" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&family=JetBrains+Mono:wght@500;700;800&display=swap&subset=vietnamese"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
