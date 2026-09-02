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
      <body style={{ margin: 0, padding: '24px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ padding: '32px', backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 8px 0' }}>Đã xảy ra lỗi ứng dụng</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>{error?.message || 'Vui lòng bấm bên dưới để khôi phục trang'}</p>
          <button
            onClick={() => reset()}
            style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            Khôi phục trang
          </button>
        </div>
      </body>
    </html>
  );
}
