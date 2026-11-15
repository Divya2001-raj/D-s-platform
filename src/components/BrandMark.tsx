import React from 'react';

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="D's platforms geometric monogram"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="de360Aurora" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
        <linearGradient id="de360Inner" x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="10"
        fill="url(#de360Inner)"
        stroke="url(#de360Aurora)"
        strokeWidth="1.5"
      />
      <path
        d="M11 10.5H19.5C24.7467 10.5 28.5 14.2533 28.5 20C28.5 25.7467 24.7467 29.5 19.5 29.5H11V10.5Z"
        stroke="url(#de360Aurora)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 15V25H19.2C22.1 25 23.8 23.1 23.8 20C23.8 16.9 22.1 15 19.2 15H15.5Z"
        fill="url(#de360Aurora)"
        fillOpacity="0.88"
      />
      <path
        d="M31.5 9.5L29.5 15.5"
        stroke="#2DD4BF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
