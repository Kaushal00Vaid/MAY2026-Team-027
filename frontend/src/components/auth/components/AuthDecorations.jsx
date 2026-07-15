/**
 * AuthDecorations.jsx
 * Shared decorative SVG atoms + compound components used by both auth pages.
 * All design tokens (colours, sizing) come from the theme defined in App.css.
 */

import { Users, ShieldCheck, Zap } from "lucide-react";

/* ─── Primitive SVG atoms ─────────────────────────────────────────────── */

/** 4-pointed sparkle / starburst */
export function Sparkle({ size = 22, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="currentColor"
    >
      <path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z" />
    </svg>
  );
}

/** Small 4-pointed diamond accent */
export function DiamondDot({ size = 10, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      className={className}
      style={style}
      fill="currentColor"
    >
      <path d="M5 0 L10 5 L5 10 L0 5 Z" />
    </svg>
  );
}

/** Dashed hexagon ring */
export function HexRing({ size = 48, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={style}
      fill="none"
    >
      <polygon
        points="24,3 43,13.5 43,34.5 24,45 5,34.5 5,13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="5 3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Dashed circle ring */
export function CircleRing({ size = 42, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      className={className}
      style={style}
      fill="none"
    >
      <circle
        cx="21"
        cy="21"
        r="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="5 3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Minimal building / tower silhouette */
export function MiniBuilding({ className = "", style = {}, width = 44 }) {
  return (
    <svg
      viewBox="0 0 56 80"
      width={width}
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Side wings */}
      <rect x="0"  y="32" width="15" height="48" rx="2" fill="currentColor" fillOpacity="0.10" />
      <rect x="41" y="32" width="15" height="48" rx="2" fill="currentColor" fillOpacity="0.10" />
      {/* Centre tower */}
      <rect x="12" y="6" width="32" height="74" rx="2.5" fill="currentColor" fillOpacity="0.16" />
      <rect x="12" y="6" width="32" height="74" rx="2.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
      {/* Windows — centre, 5 rows × 2 cols */}
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1].map((col) => (
          <rect
            key={`w-${row}-${col}`}
            x={18 + col * 12}
            y={14 + row * 13}
            width="8"
            height="6"
            rx="1.5"
            fill="currentColor"
            fillOpacity={0.55 - row * 0.06}
          />
        ))
      )}
      {/* Wing windows */}
      {[0, 1].map((row) => (
        <rect key={`lw-${row}`} x="3"  y={40 + row * 14} width="9" height="6" rx="1.5" fill="currentColor" fillOpacity="0.25" />
      ))}
      {[0, 1].map((row) => (
        <rect key={`rw-${row}`} x="44" y={40 + row * 14} width="9" height="6" rx="1.5" fill="currentColor" fillOpacity="0.25" />
      ))}
      {/* Door */}
      <rect x="22" y="64" width="12" height="16" rx="2" fill="currentColor" fillOpacity="0.18" />
      {/* Roof flag */}
      <rect x="27" y="2"  width="2"  height="8"  fill="currentColor" fillOpacity="0.30" />
      <path d="M29 2 L36 5 L29 8 Z" fill="currentColor" fillOpacity="0.40" />
    </svg>
  );
}

/** Large city skyline — used as a faint background watermark */
export function SkylineWatermark({ className = "", style = {} }) {
  return (
    <svg
      viewBox="0 0 280 200"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Building 1 */}
      <rect x="0"   y="130" width="38"  height="70"  rx="3" fill="currentColor" fillOpacity="0.07" />
      {/* Building 2 */}
      <rect x="42"  y="90"  width="48"  height="110" rx="3" fill="currentColor" fillOpacity="0.08" />
      <rect x="50"  y="80"  width="8"   height="14"  rx="2" fill="currentColor" fillOpacity="0.08" />
      {/* Windows B2 */}
      {[0,1,2,3].map(r=>[0,1].map(c=>(
        <rect key={`b2-${r}-${c}`} x={48+c*18} y={100+r*20} width="12" height="8" rx="2" fill="currentColor" fillOpacity="0.07"/>
      )))}
      {/* Centre tower */}
      <rect x="95"  y="20"  width="60"  height="180" rx="3" fill="currentColor" fillOpacity="0.10" />
      <rect x="108" y="8"   width="10"  height="16"  rx="2" fill="currentColor" fillOpacity="0.10" />
      {/* Windows Centre */}
      {[0,1,2,3,4,5,6].map(r=>[0,1].map(c=>(
        <rect key={`ct-${r}-${c}`} x={102+c*20} y={34+r*22} width="13" height="10" rx="2" fill="currentColor" fillOpacity="0.08"/>
      )))}
      {/* Building 4 */}
      <rect x="160" y="74"  width="52"  height="126" rx="3" fill="currentColor" fillOpacity="0.08" />
      {[0,1,2,3].map(r=>[0,1].map(c=>(
        <rect key={`b4-${r}-${c}`} x={166+c*18} y={86+r*22} width="12" height="9" rx="2" fill="currentColor" fillOpacity="0.07"/>
      )))}
      {/* Building 5 */}
      <rect x="216" y="114" width="64"  height="86"  rx="3" fill="currentColor" fillOpacity="0.06" />
      {/* Ground line */}
      <rect x="0"   y="196" width="280" height="4"   rx="2" fill="currentColor" fillOpacity="0.06" />
    </svg>
  );
}

/* ─── Compound chip component ─────────────────────────────────────────── */

const CHIPS = [
  { icon: Users,       label: "Trusted by",   value: "1,200+ Societies" },
  { icon: ShieldCheck, label: "Security",      value: "Bank-grade Encrypted" },
  { icon: Zap,         label: "Connectivity",  value: "Real-time Sync" },
];

/**
 * FloatingChip — a mini glass card with icon + two-line stat.
 * Pass `chipIndex` 0 / 1 / 2 to pick from the preset data.
 * `animClass` lets you attach one of auth-chip-1/2/3 from App.css.
 */
export function FloatingChip({ chipIndex = 0, className = "", animClass = "" }) {
  const { icon: Icon, label, value } = CHIPS[chipIndex % CHIPS.length];
  return (
    <div
      className={`flex items-center gap-2.5 bg-white/88 backdrop-blur-md
        border border-primary/12 rounded-2xl px-3.5 py-2.5 shadow-lg
        pointer-events-none select-none ${animClass} ${className}`}
    >
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon size={14} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-medium leading-none mb-[3px]">
          {label}
        </p>
        <p className="text-xs font-bold text-foreground leading-none">{value}</p>
      </div>
    </div>
  );
}

/** Dot-grid overlay — warm branded dots as a subtle texture */
export function DotGridBg() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(216,121,67,0.13) 1.2px, transparent 1.2px)",
        backgroundSize: "26px 26px",
      }}
    />
  );
}
