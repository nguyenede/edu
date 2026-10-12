import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '../components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'HocRealtime - Nền tảng Giáo dục & Quản lý Học tập Thông minh',
  description: 'Nền tảng giao bài, chấm điểm và tạo đề kiểm tra phân hóa tự động chuẩn Bộ GD&ĐT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`h-full ${inter.variable} ${inter.className}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#131314] text-slate-900 dark:text-slate-100 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
