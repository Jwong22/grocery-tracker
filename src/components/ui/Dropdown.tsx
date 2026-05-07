"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type DropdownOption = {
  value: string;
  label: string;
};

type Props = {
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
};

export function Dropdown({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Select…",
  size = "md",
  className,
  invalid,
  disabled,
  ariaLabel,
  id,
  name,
  "aria-invalid": ariaInvalid,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState<string>(
    defaultValue ?? options[0]?.value ?? "",
  );
  const value = isControlled ? controlledValue! : internal;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const heightCls = size === "sm" ? "h-9" : "h-10";

  const select = (next: string) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-card pl-3 pr-2 text-left text-sm text-foreground transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          heightCls,
          invalid || ariaInvalid
            ? "border-destructive focus:ring-destructive/40"
            : "border-border",
        )}
      >
        <span className={cn("truncate", !current && "text-muted-foreground")}>
          {current ? current.label : placeholder}
        </span>
        <svg
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-y-auto"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => select(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    selected && "bg-muted/60 font-medium",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {selected && (
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-primary"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m5 10 3.5 3.5L15 7"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
