"use client";

import { cn } from "@/lib/utils/cn";

// Pastel palette + order from the reference: yellow, blue, mint, pink.
const DOTS = [
  { color: "#e8c05a", delay: 0 },
  { color: "#7fb0c4", delay: 150 },
  { color: "#a8d5ba", delay: 300 },
  { color: "#f4a9b8", delay: 450 },
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
        "rounded-2xl bg-[#e3f2f8] dark:bg-[#0f1b22]",
        "[animation:loader-fade-in_300ms_ease-out]",
        className,
      )}
    >
      <div className="flex items-end justify-center gap-5 h-10">
        {DOTS.map((dot, i) => (
          <span
            key={i}
            className="loader-dot h-5 w-5 rounded-full will-change-transform"
            style={{
              backgroundColor: dot.color,
              animation: `dot-jump ${DURATION_MS}ms ease-in-out infinite`,
              animationDelay: `${dot.delay}ms`,
            }}
          />
        ))}
      </div>

      <p className="text-sm text-[#6b8a99] dark:text-muted-foreground">
        Loading…
      </p>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
