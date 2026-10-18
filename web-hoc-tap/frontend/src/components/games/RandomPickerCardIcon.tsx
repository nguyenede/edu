import React from 'react';

export const RandomPickerCardIcon: React.FC<{ size?: number }> = ({ size = 84 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
        boxShadow: '0 6px 18px rgba(236, 72, 153, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        width="100%"
        height="100%"
        fill="none"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Blue Water Waves */}
        <path
          d="M0 36q6-3 12 0t12 0 12 0 12 0v12h-48z"
          fill="#0284c7"
          stroke="none"
        />
        <path
          d="M2 38.5q5-2.5 10 0t10 0 10 0 10 0"
          stroke="#7dd3fc"
          strokeWidth={0.8}
          strokeOpacity={0.9}
        />
        <path
          d="M2 43q5-2.5 10 0t10 0 10 0 10 0"
          stroke="#7dd3fc"
          strokeWidth={0.8}
          strokeOpacity={0.9}
        />

        {/* Color Wheel at Top-Left */}
        <g transform="translate(13, 14)">
          <path d="M0 0 L-10 -7 A12 12 0 0 1 0 -12 Z" fill="#ef4444" stroke="#fff" strokeWidth={0.8} />
          <path d="M0 0 L0 -12 A12 12 0 0 1 11 -4 Z" fill="#f59e0b" stroke="#fff" strokeWidth={0.8} />
          <path d="M0 0 L11 -4 A12 12 0 0 1 7 10 Z" fill="#10b981" stroke="#fff" strokeWidth={0.8} />
          <path d="M0 0 L7 10 A12 12 0 0 1 -7 10 Z" fill="#3b82f6" stroke="#fff" strokeWidth={0.8} />
          <path d="M0 0 L-7 10 A12 12 0 0 1 -10 -7 Z" fill="#a855f7" stroke="#fff" strokeWidth={0.8} />
          <circle cx="0" cy="0" r="3" fill="#fff" stroke="#64748b" strokeWidth={0.8} />
        </g>

        {/* 3 Student heads with question marks at Top-Right */}
        <g transform="translate(26, 6) scale(0.6)">
          {/* Head 1 */}
          <circle cx="6" cy="12" r="5" fill="#fff" stroke="none" />
          <path d="M1 11a5 5 0 0 1 10 0c-1.5-1-3-1.5-5-1.5s-3.5.5-5 1.5z" fill="#334155" stroke="none" />
          <text x="6" y="15" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#6366f1" stroke="none">?</text>

          {/* Head 2 */}
          <circle cx="16" cy="8" r="5" fill="#fff" stroke="none" />
          <path d="M11 7a5 5 0 0 1 10 0c-1.5-1-3-1.5-5-1.5s-3.5.5-5 1.5z" fill="#334155" stroke="none" />
          <text x="16" y="11" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#ec4899" stroke="none">?</text>

          {/* Head 3 */}
          <circle cx="26" cy="12" r="5" fill="#fff" stroke="none" />
          <path d="M21 11a5 5 0 0 1 10 0c-1.5-1-3-1.5-5-1.5s-3.5.5-5 1.5z" fill="#334155" stroke="none" />
          <text x="26" y="15" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#3b82f6" stroke="none">?</text>

          {/* Camera Icon */}
          <rect x="8" y="17" width="16" height="11" rx="2.5" fill="#1e293b" stroke="#fff" strokeWidth={1} />
          <circle cx="16" cy="22.5" r="3" fill="#38bdf8" stroke="#fff" strokeWidth={0.8} />
        </g>

        {/* Yellow Rubber Duck at Bottom-Right */}
        <g transform="translate(24, 23)">
          {/* Duck body */}
          <path
            d="M2 13 C-1 9 4 4 11 6 C15 2 21 3 22 7 C25 8 25 13 22 15 C17 18 6 18 2 13 Z"
            fill="#ffcc00"
            stroke="#eab308"
            strokeWidth={0.8}
          />
          {/* Head */}
          <circle cx="18" cy="5" r="4.5" fill="#ffcc00" stroke="#eab308" strokeWidth={0.6} />
          {/* Beak */}
          <path d="M22 5 L26 6.5 L22 8 Z" fill="#f97316" stroke="none" />
          {/* Eye */}
          <circle cx="19" cy="4.2" r="0.9" fill="#0f172a" stroke="none" />
          <circle cx="19.3" cy="3.9" r="0.3" fill="#fff" stroke="none" />
          {/* Wing */}
          <path d="M8 11 C10 9 15 10 14 13 C12 14.5 9 14 8 11 Z" fill="#fde047" stroke="#eab308" strokeWidth={0.6} />
        </g>
      </svg>
    </div>
  );
};
