/**
 * Original mosque hero illustration — hand-built SVG, no photography/stock assets.
 * Matches brand palette: emerald #1b4332/#2d6a4f, gold #f4d58d, cream #faf7f2 sky.
 * Used as background in the home page hero (replaces the CSS gradient placeholder).
 */
export default function MosqueHeroIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a mosque at dusk"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe3f5" />
          <stop offset="45%" stopColor="#f3dfc2" />
          <stop offset="100%" stopColor="#faf7f2" />
        </linearGradient>
        <linearGradient id="domeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a7d63" />
          <stop offset="100%" stopColor="#1b4332" />
        </linearGradient>
        <linearGradient id="minaretGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e9e4d8" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="70%" cy="18%" r="35%">
          <stop offset="0%" stopColor="#f4d58d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f4d58d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="400" height="300" fill="url(#sky)" />
      <circle cx="280" cy="55" r="110" fill="url(#sunGlow)" />

      {/* Birds */}
      <g stroke="#8a8577" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6">
        <path d="M60 50 q6 -8 12 0 q6 -8 12 0" />
        <path d="M100 70 q5 -7 10 0 q5 -7 10 0" />
      </g>

      {/* Ground / horizon */}
      <rect y="255" width="400" height="45" fill="#e7e0cf" />

      {/* Side minarets */}
      <g>
        <rect x="55" y="120" width="14" height="135" fill="url(#minaretGrad)" />
        <polygon points="62,90 48,120 76,120" fill="url(#domeGrad)" />
        <circle cx="62" cy="84" r="4" fill="#f4d58d" />

        <rect x="320" y="110" width="14" height="145" fill="url(#minaretGrad)" />
        <polygon points="327,78 313,110 341,110" fill="url(#domeGrad)" />
        <circle cx="327" cy="72" r="4" fill="#f4d58d" />
      </g>

      {/* Main building */}
      <rect x="120" y="175" width="160" height="80" fill="#ffffff" />
      <rect x="120" y="175" width="160" height="8" fill="#e9e4d8" />

      {/* Arched doorway */}
      <path d="M185 255 v-35 a15 15 0 0 1 30 0 v35 z" fill="#1b4332" opacity="0.85" />

      {/* Decorative arch windows */}
      <g fill="#2d6a4f" opacity="0.75">
        <path d="M138 220 v-20 a8 8 0 0 1 16 0 v20 z" />
        <path d="M246 220 v-20 a8 8 0 0 1 16 0 v20 z" />
      </g>

      {/* Central dome */}
      <ellipse cx="200" cy="172" rx="42" ry="10" fill="#16211c" opacity="0.08" />
      <path d="M158 175 a42 55 0 0 1 84 0 z" fill="url(#domeGrad)" />
      <rect x="196" y="95" width="8" height="26" fill="url(#minaretGrad)" />
      <circle cx="200" cy="90" r="5" fill="#f4d58d" />

      {/* Small flanking domes */}
      <path d="M150 178 a18 22 0 0 1 36 0 z" fill="#2d6a4f" />
      <path d="M214 178 a18 22 0 0 1 36 0 z" fill="#2d6a4f" />

      {/* Palm silhouettes */}
      <g fill="#4a6b52" opacity="0.85">
        <path d="M40 255 q-2 -30 -18 -38 q14 2 20 18 q2 -18 -6 -32 q16 6 14 30 q10 -14 26 -12 q-12 8 -14 20 q10 -4 20 4 q-14 2 -22 14 z" />
        <path d="M370 255 q2 -26 16 -33 q-12 2 -18 16 q-2 -16 6 -28 q-14 6 -12 26 q-10 -12 -24 -10 q12 8 12 18 q-10 -4 -18 4 q12 2 20 12 z" />
      </g>
    </svg>
  );
}
