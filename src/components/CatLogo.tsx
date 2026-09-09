/** Hand-drawn kitten avatar (inline SVG) — the app's mascot. */
export default function CatLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" aria-label="猫咪头像">
      <path d="M10 20 L8 6 L19 12 Z" fill="#8b90d3" />
      <path d="M38 20 L40 6 L29 12 Z" fill="#8b90d3" />
      <path d="M10 20 L8.8 9.5 L17.5 14 Z" fill="#b0b5e8" />
      <path d="M38 20 L39.2 9.5 L30.5 14 Z" fill="#b0b5e8" />
      <ellipse cx="24" cy="27" rx="16.5" ry="14.5" fill="#d384a0" />
      <ellipse cx="24" cy="29" rx="13" ry="11" fill="#f0d3dd" />
      <ellipse cx="18" cy="25" rx="2.4" ry="3.1" fill="#3d3a55" />
      <ellipse cx="30" cy="25" rx="2.4" ry="3.1" fill="#3d3a55" />
      <circle cx="18.9" cy="24" r=".9" fill="#fff" />
      <circle cx="30.9" cy="24" r=".9" fill="#fff" />
      <path d="M24 28.5 L22.6 30.4 L25.4 30.4 Z" fill="#b45f7e" />
      <path
        d="M24 30.4 Q24 32.6 21.4 32.4 M24 30.4 Q24 32.6 26.6 32.4"
        stroke="#3d3a55"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
      />
      <g stroke="#3d3a55" strokeWidth="1.1" strokeLinecap="round">
        <path d="M12 26.5 L5.5 25 M12 29 L6.5 30.5" />
        <path d="M36 26.5 L42.5 25 M36 29 L41.5 30.5" />
      </g>
      <ellipse cx="14.6" cy="30.2" rx="1.8" ry="1.2" fill="#e8a7bd" opacity=".7" />
      <ellipse cx="33.4" cy="30.2" rx="1.8" ry="1.2" fill="#e8a7bd" opacity=".7" />
    </svg>
  )
}
