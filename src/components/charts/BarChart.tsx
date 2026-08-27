import type { SeriesPoint } from "@/lib/analytics/spending";
import { cn } from "@/lib/utils/cn";

const myr0 = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type Props = {
  data: SeriesPoint[];
  /** Show every Nth x-axis label to avoid crowding (default 1 = all). */
  labelEvery?: number;
  className?: string;
};

/**
 * Zero-dependency responsive bar chart. Renders as an SVG that scales to its
 * container width via a viewBox. Bars are spend amounts; the tallest bar fills
 * the plot height. Accessible: each bar has a <title> tooltip.
 */
export function BarChart({ data, labelEvery = 1, className }: Props) {
  const width = 640;
  const height = 200;
  const padding = { top: 12, right: 8, bottom: 22, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(0, ...data.map((d) => d.amount));
  const n = data.length || 1;
  const slot = plotW / n;
  const barW = Math.max(1, slot * 0.62);

  const hasData = data.some((d) => d.amount > 0);

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Spending bar chart"
        preserveAspectRatio="none"
      >
        {/* baseline */}
        <line
          x1={padding.left}
          y1={padding.top + plotH}
          x2={padding.left + plotW}
          y2={padding.top + plotH}
          className="stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {data.map((d, i) => {
          const h = max > 0 ? (d.amount / max) * plotH : 0;
          const x = padding.left + i * slot + (slot - barW) / 2;
          const y = padding.top + plotH - h;
          const showLabel = i % labelEvery === 0 || i === data.length - 1;
          return (
            <g key={d.key}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2}
                className={cn(
                  d.amount > 0 ? "fill-primary" : "fill-muted",
                )}
              >
                <title>
                  {d.label}: {myr0.format(d.amount)}
                </title>
              </rect>
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {!hasData && (
        <figcaption className="text-center text-xs text-muted-foreground mt-1">
          No spending recorded in this period yet.
        </figcaption>
      )}
    </figure>
  );
}
