"use client";

import { cn } from "@/lib/utils/cn";

/**
 * A cute animated loader with bouncing grocery items.
 */
export function CuteLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12",
        className,
      )}
    >
      <div className="relative h-16 w-32">
        {/* Bouncing items */}
        <span className="absolute left-3 animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }}>
          🥕
        </span>
        <span className="absolute left-11 animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "150ms" }}>
          🥦
        </span>
        <span className="absolute left-[76px] animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "300ms" }}>
          🍎
        </span>
        <span className="absolute right-3 animate-[bounce_0.8s_ease-in-out_infinite]" style={{ animationDelay: "450ms" }}>
          🧈
        </span>
      </div>
      {/* Cart rolling in */}
      <div className="animate-[wiggle_1.2s_ease-in-out_infinite] text-3xl">
        🛒
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Loading goodies…
      </p>
    </div>
  );
}
