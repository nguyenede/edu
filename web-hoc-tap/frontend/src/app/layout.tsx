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
  title: 'KiyoEdu - Nền tảng Giáo dục & Quản lý Học tập Thông minh',
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
        {/* Anti-crash shield for third-party extensions like Urban VPN Proxy (prevents M_ID error) */}
        <script
          id="urban-vpn-config-shield"
          data-config='{"config":{"properties":{"M_ID":"1","M_TYPE":"1"}}}'
        />
        <script
          id="extension-error-shield"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                function isExtensionError(detail) {
                  if (!detail) return false;
                  var s = String(detail);
                  return (
                    s.indexOf('chrome-extension://') !== -1 ||
                    s.indexOf('moz-extension://') !== -1 ||
                    s.indexOf('safari-web-extension://') !== -1 ||
                    s.indexOf('M_ID') !== -1 ||
                    s.indexOf('eppiocemhmnlbhjplcgkofciiegomcon') !== -1
                  );
                }

                window.addEventListener('error', function(e) {
                  var detail = (e.filename || '') + ' ' + (e.message || '') + ' ' + (e.error && e.error.stack || '');
                  if (isExtensionError(detail)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason;
                  var detail = ((reason && reason.stack) || '') + ' ' + ((reason && reason.message) || '') + ' ' + String(reason || '');
                  if (isExtensionError(detail)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                var origOnError = window.onerror;
                window.onerror = function(msg, url, line, col, err) {
                  var detail = (msg || '') + ' ' + (url || '') + ' ' + (err && err.stack || '');
                  if (isExtensionError(detail)) {
                    return true;
                  }
                  if (origOnError) return origOnError.apply(this, arguments);
                };
              })();
            `,
          }}
        />
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
