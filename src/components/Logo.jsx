import React from 'react';

// Theme-aware colors (Tailwind CSS tokens)
const C_BASE = 'hsl(var(--card))';
const C_OUTLINE = 'hsl(var(--primary))';
const C_TRACE = 'hsl(var(--primary))';
const C_PAD = 'hsl(var(--primary-foreground))';
const C_TEXT = 'hsl(var(--foreground))';
const C_TAG = 'hsl(var(--muted-foreground))';

const LogoIcon = ({ size = 40 }) => {
  const s = Math.max(24, size);
  const stroke = Math.max(2, Math.round(s * 0.06));
  const pad = Math.round(s * 0.18);
  const r = Math.round(s * 0.18);

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      role="img"
      aria-label="PCB Xpress logo"
    >
      {/* Outer outline with stronger bottom corners (wheel-like hint) */}
      <path
        d={`M ${r} ${stroke/2}
           H ${s - r}
           A ${r} ${r} 0 0 1 ${s - stroke/2} ${r}
           V ${s - r}
           A ${r*1.25} ${r*1.25} 0 0 1 ${s - r*1.25} ${s - stroke/2}
           H ${r*1.25}
           A ${r*1.25} ${r*1.25} 0 0 1 ${stroke/2} ${s - r}
           V ${r}
           A ${r} ${r} 0 0 1 ${r} ${stroke/2}
           Z`}
        fill={C_BASE}
        stroke={C_OUTLINE}
        strokeWidth={stroke}
      />

      {/* PCB trace style "X" */}
      <g stroke={C_TRACE} strokeWidth={Math.max(2, Math.round(s * 0.08))} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${pad} ${pad} L ${s - pad} ${s - pad}`} />
        <path d={`M ${s - pad} ${pad} L ${pad} ${s - pad}`} />
      </g>
      {/* Vias/pads on the X arms */}
      <g fill={C_PAD} opacity="0.95">
        <circle cx={s / 2} cy={s / 2} r={Math.max(1.6, Math.round(s * 0.06))} />
        <circle cx={pad} cy={pad} r={Math.max(1.2, Math.round(s * 0.04))} />
        <circle cx={s - pad} cy={pad} r={Math.max(1.2, Math.round(s * 0.04))} />
        <circle cx={pad} cy={s - pad} r={Math.max(1.2, Math.round(s * 0.04))} />
        <circle cx={s - pad} cy={s - pad} r={Math.max(1.2, Math.round(s * 0.04))} />
      </g>

      {/* IoT antenna: small stub + waves integrated on top-right arm */}
      <g stroke={C_TRACE} strokeWidth={Math.max(1, Math.round(s * 0.03))} fill="none" strokeLinecap="round" opacity="0.95">
        <path d={`M ${s*0.68} ${s*0.18} l ${s*0.06} ${s*0.06}`} />
        <path d={`M ${s*0.78} ${s*0.12} q ${s*0.06} ${s*0.06} 0 ${s*0.12}`} />
        <path d={`M ${s*0.72} ${s*0.16} q ${s*0.06} ${s*0.06} 0 ${s*0.10}`} />
      </g>
    </svg>
  );
};

// Inline X mark built from PCB traces (for wordmark replacement)
const TraceX = ({ size = 16, color = C_TRACE }) => {
  const s = Math.max(12, size);
  const stroke = Math.max(1.5, Math.round(s * 0.18));
  const pad = Math.round(s * 0.18);
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden>
      <g stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={`M ${pad} ${pad} L ${s - pad} ${s - pad}`} />
        <path d={`M ${s - pad} ${pad} L ${pad} ${s - pad}`} />
      </g>
      <g fill={color} opacity="0.9">
        <circle cx={s / 2} cy={s / 2} r={Math.max(1, Math.round(s * 0.12))} />
      </g>
      {/* Tiny antenna waves */}
      <g stroke={color} strokeWidth={Math.max(0.8, Math.round(s * 0.08))} fill="none" strokeLinecap="round" opacity="0.9">
        <path d={`M ${s*0.70} ${s*0.18} q ${s*0.10} ${s*0.10} 0 ${s*0.20}`} />
      </g>
    </svg>
  );
};

const Logo = ({ size = 40, showText = true, tagline = 'Pcb Manufacturing' }) => {
  const textPrimary = C_TEXT;
  const xColor = C_TRACE;
  const tagColor = C_TAG;
  return (
    <div className="flex items-center gap-2 select-none">
      <LogoIcon size={size} />
      {showText && (
        <div className="leading-tight">
          <div className="flex items-baseline gap-1">
            <span style={{ color: textPrimary }} className="text-xl font-bold tracking-tight">PCB</span>
            <span className="inline-block align-middle" aria-hidden>
              <TraceX size={Math.round(size * 0.46)} color={xColor} />
            </span>
            <span style={{ color: textPrimary }} className="text-xl font-semibold tracking-tight">press</span>
          </div>
          {tagline && (
            <div className="text-[10px] uppercase tracking-wider" style={{ color: tagColor }}>{tagline}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
