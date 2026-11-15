import React, { useEffect, useState } from 'react';

export const CUSTOM_BRAND_LOGO_KEY = 'de360_custom_brand_logo_v1';
export const BRAND_LOGO_EVENT = 'de360-brand-logo-updated';

export function getCustomBrandLogo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CUSTOM_BRAND_LOGO_KEY);
  } catch {
    return null;
  }
}

export function setCustomBrandLogo(dataUrl: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (dataUrl) {
      window.localStorage.setItem(CUSTOM_BRAND_LOGO_KEY, dataUrl);
    } else {
      window.localStorage.removeItem(CUSTOM_BRAND_LOGO_KEY);
    }
    window.dispatchEvent(new Event(BRAND_LOGO_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

interface BrandMarkProps {
  size?: number;
  variant?: 'avatar' | 'crest';
  showOnlineDot?: boolean;
}

export function BrandMark({
  size = 38,
  variant = 'avatar',
  showOnlineDot = false,
}: BrandMarkProps) {
  const [customSrc, setCustomSrc] = useState<string | null>(() => getCustomBrandLogo());

  useEffect(() => {
    const sync = () => setCustomSrc(getCustomBrandLogo());
    window.addEventListener(BRAND_LOGO_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(BRAND_LOGO_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const ringClass = variant === 'avatar' ? 'rounded-full' : 'rounded-[18px]';
  const dotSize = Math.max(8, Math.round(size * 0.19));

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Glowing BTS Borahae Royal Purple -> Lavender -> Orchid outer gradient ring */}
      <div
        className={`flex h-full w-full items-center justify-center p-[2.5px] shadow-[0_0_24px_rgba(139,92,246,0.45)] ${ringClass}`}
        style={{
          background: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 48%, #D946EF 100%)',
        }}
      >
        <div
          className={`flex h-full w-full items-center justify-center overflow-hidden bg-[#121016] p-[2px] ${ringClass}`}
        >
          {customSrc ? (
            <img
              src={customSrc}
              alt="D's platforms Siberian Husky Emblem"
              className={`h-full w-full object-cover ${ringClass}`}
            />
          ) : (
            <svg
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="D's platforms Copper-Red Siberian Husky Emblem"
              className="h-full w-full"
            >
              <defs>
                <linearGradient id="copperCoat" x1="16" y1="10" x2="48" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#D36B3F" />
                  <stop offset="55%" stopColor="#AD4A27" />
                  <stop offset="100%" stopColor="#7C321A" />
                </linearGradient>
                <linearGradient id="earOuter" x1="14" y1="8" x2="26" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#D36B3F" />
                  <stop offset="100%" stopColor="#8B3B20" />
                </linearGradient>
              </defs>

              <circle cx="32" cy="32" r="31" fill="#1E1B24" />

              {/* Fluffy Pointed Upright Ears (Copper-Red Outer, Cream Inner Fur) */}
              <path
                d="M14.5 28.5C12.5 21 12 13 14 8.8C17.5 11.2 22.5 15.8 25.8 20.5Z"
                fill="url(#earOuter)"
                stroke="#5E2411"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M49.5 28.5C51.5 21 52 13 50 8.8C46.5 11.2 41.5 15.8 38.2 20.5Z"
                fill="url(#earOuter)"
                stroke="#5E2411"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              {/* Cream Inner Ear Fur */}
              <path d="M16 24.5C15 19.5 14.8 14.8 15.8 12.2C18.2 14.2 21.4 17.5 23 20.5Z" fill="#F4E4D4" />
              <path d="M48 24.5C49 19.5 49.2 14.8 48.2 12.2C45.8 14.2 42.6 17.5 41 20.5Z" fill="#F4E4D4" />

              {/* Fluffy Cheek Ruff & Outer Head Silhouette */}
              <path
                d="M14 27C10.5 31.5 10.2 37.5 13 42C17.5 49.2 25.5 54.5 32 55C38.5 54.5 46.5 49.2 51 42C53.8 37.5 53.5 31.5 50 27C47 21 40.5 17.5 32 17.5C23.5 17.5 17 21 14 27Z"
                fill="url(#copperCoat)"
                stroke="#4E1E0F"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />

              {/* Crisp Snow-White Lower Face, Cheeks & Muzzle + Signature Thin Vertical Forehead Blaze */}
              <path
                d="M32 17.6L33.4 27.2C36.8 26.8 41.2 27.6 44.8 30.8C47.8 33.4 49.8 37.2 49.4 41.4C45.4 48.2 38.5 53.5 32 54C25.5 53.5 18.6 48.2 14.6 41.4C14.2 37.2 16.2 33.4 19.2 30.8C22.8 27.6 27.2 26.8 30.6 27.2L32 17.6Z"
                fill="#F8F9F5"
              />

              {/* Subtle Cheek Fur Tuft Shading */}
              <path d="M14.8 39.2L19.5 41.5L16.8 44.5Z" fill="#E6EAE2" />
              <path d="M49.2 39.2L44.5 41.5L47.2 44.5Z" fill="#E6EAE2" />

              {/* Warm Amber-Gold Almond Eyes with Sharp Dark Eyeliner Rims */}
              <path d="M20.2 32.5C22 30.5 25.5 30.6 27.6 32.6C25.6 34.8 22.2 34.8 20.2 32.5Z" fill="#1B241E" />
              <path d="M43.8 32.5C42 30.5 38.5 30.6 36.4 32.6C38.4 34.8 41.8 34.8 43.8 32.5Z" fill="#1B241E" />
              <ellipse cx="24.1" cy="32.6" rx="2.1" ry="1.6" fill="#E9B44C" />
              <ellipse cx="39.9" cy="32.6" rx="2.1" ry="1.6" fill="#E9B44C" />
              <circle cx="24.1" cy="32.6" r="0.9" fill="#161A17" />
              <circle cx="39.9" cy="32.6" r="0.9" fill="#161A17" />
              <circle cx="23.5" cy="32.1" r="0.45" fill="#FFFFFF" />
              <circle cx="39.3" cy="32.1" r="0.45" fill="#FFFFFF" />

              {/* Soft Dusty Rose-Brown Nose & Gentle Smile Line */}
              <path
                d="M27.6 42.2C27.6 40.6 36.4 40.6 36.4 42.2C36.4 44.1 33.8 46.2 32 46.4C30.2 46.2 27.6 44.1 27.6 42.2Z"
                fill="#9C5B53"
                stroke="#5E302B"
                strokeWidth="1"
              />
              <ellipse cx="30.6" cy="42.1" rx="0.9" ry="0.55" fill="#BA7B73" />
              <path
                d="M32 46.4V49.2M28.6 48.6C30 49.8 31.2 49.8 32 49.2C32.8 49.8 34 49.8 35.4 48.6"
                stroke="#4E3832"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {showOnlineDot && (
        <span
          className="absolute right-0.5 bottom-0.5 rounded-full border-2 border-[#121016] bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.75)]"
          style={{ width: dotSize, height: dotSize }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
