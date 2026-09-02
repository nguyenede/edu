import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '../components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HocRealtime - Nền tảng Giáo dục & Chaos Quiz',
  description: 'Nền tảng giao bài, chấm điểm và thi đấu trắc nghiệm realtime Chaos Quiz',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
