"use client";

import { cn } from "@/lib/utils/cn";

/**
 * Minimalist pastel "blob" loader — soft organic shapes gently drifting and
 * breathing on a calm background. No dependencies; pure SVG + CSS. Honors
 * prefers-reduced-motion (shapes hold still).
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
      <svg
        viewBox="0 0 240 200"
        className="w-56 h-auto sm:w-64"
        role="img"
        aria-label="Loading"
      >
        {/* mint bean — top */}
        <path
          className="blob"
          style={{
            animation: "blob-float-a 3.4s ease-in-out infinite, blob-breathe 3.4s ease-in-out infinite",
            transformOrigin: "center",
          }}
          fill="#a8d5ba"
          d="M96 58c14-6 34-8 40 4 5 10-3 20-14 24-7 3-9 9-16 9-12 0-24-6-25-18-1-11 4-15 15-19z"
        />
        {/* pink pill — right */}
        <rect
          className="blob"
          style={{
            animation: "blob-float-d 3s ease-in-out infinite, blob-breathe 3s ease-in-out infinite",
            transformOrigin: "center",
          }}
          x="176"
          y="70"
          width="26"
          height="52"
          rx="13"
          fill="#f4a9b8"
        />
        {/* yellow dot — left */}
        <circle
          className="blob"
          style={{
            animation: "blob-float-c 2.6s ease-in-out infinite",
            transformOrigin: "center",
          }}
          cx="66"
          cy="108"
          r="16"
          fill="#e8c05a"
        />
        {/* blue kidney bean — bottom */}
        <path
          className="blob"
          style={{
            animation: "blob-float-b 3.8s ease-in-out infinite, blob-breathe 3.8s ease-in-out infinite",
            transformOrigin: "center",
          }}
          fill="#7fb0c4"
          d="M108 132c16-8 40-4 42 12 2 14-14 22-28 24-10 1-16 8-26 4-12-5-16-20-10-32 4-9 12-4 22-8z"
        />
      </svg>

      <p className="text-sm text-muted-foreground">Loading…</p>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
