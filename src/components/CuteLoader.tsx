"use client";

import { cn } from "@/lib/utils/cn";

/**
 * A cute animated loader with bouncing grocery items — centered on screen.
 */
export function CuteLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[60vh] gap-3",
        className,
      )}
    >
      {/* Bouncing items - evenly spaced */}
      <div className="flex items-end justify-center gap-6 h-20">
        <span className="text-4xl animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }}>
          🥕
        </span>
        <span className="text-4xl animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "150ms" }}>
          🥦
        </span>
        <span className="text-4xl animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "300ms" }}>
          🍎
        </span>
        <span className="text-4xl animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "450ms" }}>
          🧈
        </span>
      </div>
      {/* Cart wiggling */}
      <div className="animate-[wiggle_1.2s_ease-in-out_infinite] text-5xl">
        🛒
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Loading goodies…
      </p>
    </div>
  );
}
