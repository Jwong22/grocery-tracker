"use client";

import { cn } from "@/lib/utils/cn";

// Pastel palette from the reference: mint, pink, yellow, blue.
const DOTS = [
  { color: "#a8d5ba", delay: 0 },
  { color: "#f4a9b8", delay: 150 },
  { color: "#e8c05a", delay: 300 },
  { color: "#7fb0c4", delay: 450 },
] as const;

// One full cycle across all four dots.
const DURATION_MS = 1200;

/**
 * Four pastel dots with a jump that travels from one dot to the next in a
 * loop. Pure CSS; honors prefers-reduced-motion.
 */
export function CuteLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[60vh] gap-6",
        "[animation:loader-fade-in_300ms_ease-out]",
        className,
      )}
    >
      <div className="flex items-end justify-center gap-4 h-10">
        {DOTS.map((dot, i) => (
          <span
            key={i}
            className="loader-dot h-4 w-4 rounded-full will-change-transform"
            style={{
              backgroundColor: dot.color,
              animation: `dot-jump ${DURATION_MS}ms ease-in-out infinite`,
              animationDelay: `${dot.delay}ms`,
            }}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground">Loading…</p>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
