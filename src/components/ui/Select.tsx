import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border bg-card pl-3 pr-9 py-2 text-sm text-foreground transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          invalid
            ? "border-destructive focus:ring-destructive/40"
            : "border-border",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
      </svg>
    </div>
  );
});
