/**
 * components/studio/Logo.tsx — inline brand mark (paper + fold + gold diamond
 * on an ink→accent gradient). Used by the studio topbar and dashboard.
 */

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="washi" role="img">
      <defs>
        <linearGradient id="washi-lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1C1917" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id="washi-lg-fold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FED7AA" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#washi-lg-bg)" />
      <path
        d="M22 15 h13.5 L47 26.5 V47 a3.5 3.5 0 0 1 -3.5 3.5 H22 A3.5 3.5 0 0 1 18.5 47 V18.5 A3.5 3.5 0 0 1 22 15 Z"
        fill="#FFFCF8"
      />
      <path d="M35.5 15 L47 26.5 h-9.5 a2 2 0 0 1 -2 -2 Z" fill="url(#washi-lg-fold)" />
      <rect x="26" y="34" width="9" height="9" rx="2" transform="rotate(45 30.5 38.5)" fill="#F59E0B" />
      <path d="M24.5 24.5 h7" stroke="#E7E5E0" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
