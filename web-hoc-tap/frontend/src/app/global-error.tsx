'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error caught by boundary:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafd', color: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', width: '90%', padding: '40px 32px', backgroundColor: '#ffffff', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ffffff', padding: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" style={{ width: '24px', height: '24px', maxWidth: '24px', maxHeight: '24px' }}>
                <path fill="#4285F4" d="M12 2L2 19.7h8.4L12 16.2l3.6 3.5H22L12 2z" />
                <path fill="#FBBC05" d="M2 19.7h8.4L15.6 12 12 2 2 19.7z" />
                <path fill="#34A853" d="M12 16.2l3.6 3.5H22L17.2 12 12 16.2z" />
                <path fill="#EA4335" d="M12 2l5.2 10 4.8 7.7L12 2z" />
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.5px' }}>
              KiyoEdu
            </span>
          </div>

          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: '700', marginBottom: '16px' }}>
            LỖI HỆ THỐNG
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Đã xảy ra sự cố ứng dụng
          </h1>

          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            {error?.message || 'Ứng dụng gặp sự cố trong quá trình khởi tạo. Vui lòng bấm bên dưới để khôi phục lại trang.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                try {
                  reset();
                } catch {
                  window.location.reload();
                }
              }}
              style={{ padding: '10px 20px', backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', borderRadius: '999px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(26, 115, 232, 0.2)' }}
            >
              Thử lại ngay
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '999px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
