"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function FabMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close menu on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleOption = (action: "camera" | "gallery" | "manual") => {
    setOpen(false);
    switch (action) {
      case "camera":
        router.push("/add/price/batch?source=camera");
        break;
      case "gallery":
        router.push("/add/price/batch?source=gallery");
        break;
      case "manual":
        router.push("/add/price");
        break;
    }
  };

  return (
    <>
      {/* Backdrop overlay when menu is open */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bubble options - fixed to bottom center, above the nav */}
      <div
        ref={menuRef}
        className={cn(
          "fixed bottom-32 left-1/2 -translate-x-1/2 z-50 flex items-end gap-5",
          "transition-all duration-300 ease-out",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-8 pointer-events-none",
        )}
        role="menu"
        aria-label="Add price options"
      >
        {/* Left bubble: Take Photo */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handleOption("camera")}
          className={cn(
            "flex flex-col items-center gap-2 transition-all duration-300",
            open
              ? "opacity-100 translate-y-0 delay-75"
              : "opacity-0 translate-y-3",
          )}
        >
          <span
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-2xl",
              "bg-primary-soft text-primary-soft-foreground shadow-md",
              "active:scale-90 transition-transform",
              "border border-primary/20",
            )}
            aria-hidden="true"
          >
            <CameraIcon className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium text-foreground">
            Photo
          </span>
        </button>

        {/* Center bubble: Choose from Gallery */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handleOption("gallery")}
          className={cn(
            "flex flex-col items-center gap-2 transition-all duration-300",
            open
              ? "opacity-100 translate-y-0 delay-100"
              : "opacity-0 translate-y-3",
          )}
        >
          <span
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-2xl",
              "bg-accent-soft text-accent-soft-foreground shadow-md",
              "active:scale-90 transition-transform",
              "border border-accent/20",
            )}
            aria-hidden="true"
          >
            <GalleryIcon className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium text-foreground">
            Gallery
          </span>
        </button>

        {/* Right bubble: Manual Entry */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handleOption("manual")}
          className={cn(
            "flex flex-col items-center gap-2 transition-all duration-300",
            open
              ? "opacity-100 translate-y-0 delay-150"
              : "opacity-0 translate-y-3",
          )}
        >
          <span
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-2xl",
              "bg-info-soft text-info-soft-foreground shadow-md",
              "active:scale-90 transition-transform",
              "border border-border",
            )}
            aria-hidden="true"
          >
            <PenIcon className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium text-foreground">
            Manual
          </span>
        </button>
      </div>

      {/* FAB button */}
      <button
        type="button"
        aria-label="Add price"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "absolute -top-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg ring-4 ring-background",
          "transition-transform hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
          open && "rotate-45",
        )}
      >
        <PlusIcon className="h-6 w-6 transition-transform duration-300" />
      </button>
    </>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GalleryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function PenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
