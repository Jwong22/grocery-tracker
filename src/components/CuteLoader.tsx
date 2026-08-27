"use client";

import { cn } from "@/lib/utils/cn";

const ITEMS = ["🥕", "🥦", "🍎", "🧈"] as const;

/**
 * A polished animated loader: grocery items gently float in sequence above a
 * rolling cart, with a shimmering progress bar. Respects reduced-motion.
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
      {/* Floating items above their shadows */}
      <div className="flex items-end justify-center gap-5 h-16">
        {ITEMS.map((item, i) => (
          <span key={item} className="relative flex flex-col items-center">
            <span
              className="loader-item text-3xl sm:text-4xl will-change-transform"
              style={{
                animation: "item-pop 1.1s cubic-bezier(0.45,0,0.55,1) infinite",
                animationDelay: `${i * 130}ms`,
              }}
            >
              {item}
            </span>
            {/* soft shadow */}
            <span
              className="loader-item mt-1 h-1.5 w-6 rounded-full bg-foreground/10 blur-[1px]"
              style={{
                animation: "item-pop 1.1s cubic-bezier(0.45,0,0.55,1) infinite",
                animationDelay: `${i * 130}ms`,
                animationDirection: "alternate-reverse",
              }}
              aria-hidden="true"
            />
          </span>
        ))}
      </div>

      {/* Rolling cart */}
      <div
        className="loader-cart text-4xl sm:text-5xl will-change-transform"
        style={{ animation: "cart-roll 1.4s ease-in-out infinite" }}
      >
        🛒
      </div>

      {/* Shimmer progress bar */}
      <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        <span
          className="loader-shimmer absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary/70"
          style={{ animation: "loader-shimmer 1.3s ease-in-out infinite" }}
          aria-hidden="true"
        />
      </div>

      <p className="text-sm text-muted-foreground">Loading goodies…</p>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
