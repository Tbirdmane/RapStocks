import { colors } from "@/lib/design-tokens";

/**
 * Tiny dependency-free SVG line chart. Renders a single series; line + soft
 * area fill colored green/red by overall direction (first vs last point).
 * Server-renderable (no client JS), which keeps the bundle small.
 */
export function LineChart({
  points,
  height = 120,
  className = "",
}: {
  points: number[];
  height?: number;
  className?: string;
}) {
  if (points.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-text-faint ${className}`}
        style={{ height }}
      >
        Not enough price history yet
      </div>
    );
  }

  const W = 300;
  const H = height;
  const pad = 6;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (p - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });

  const up = points[points.length - 1] >= points[0];
  const stroke = up ? colors.up : colors.down;
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area =
    `M${coords[0][0].toFixed(1)},${(H - pad).toFixed(1)} ` +
    coords.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") +
    ` L${coords[coords.length - 1][0].toFixed(1)},${(H - pad).toFixed(1)} Z`;

  const gid = `g-${up ? "u" : "d"}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
